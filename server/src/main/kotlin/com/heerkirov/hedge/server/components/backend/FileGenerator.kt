package com.heerkirov.hedge.server.components.backend

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.components.status.AppStatusDriver
import com.heerkirov.hedge.server.dao.FileFingerprints
import com.heerkirov.hedge.server.dao.FileRecords
import com.heerkirov.hedge.server.dao.ImportImages
import com.heerkirov.hedge.server.enums.AppLoadStatus
import com.heerkirov.hedge.server.enums.ArchiveType
import com.heerkirov.hedge.server.enums.FileStatus
import com.heerkirov.hedge.server.enums.FingerprintStatus
import com.heerkirov.hedge.server.events.*
import com.heerkirov.hedge.server.exceptions.BusinessException
import com.heerkirov.hedge.server.exceptions.IllegalFileExtensionError
import com.heerkirov.hedge.server.library.framework.DaemonThreadComponent
import com.heerkirov.hedge.server.library.framework.StatefulComponent
import com.heerkirov.hedge.server.model.FileRecord
import com.heerkirov.hedge.server.utils.DateTime
import com.heerkirov.hedge.server.utils.Graphics
import com.heerkirov.hedge.server.utils.Similarity
import com.heerkirov.hedge.server.utils.deleteIfExists
import com.heerkirov.hedge.server.utils.ktorm.asSequence
import com.heerkirov.hedge.server.utils.ktorm.first
import com.heerkirov.hedge.server.utils.tools.loopPoolThread
import com.heerkirov.hedge.server.utils.tuples.Tuple4
import org.ktorm.dsl.*
import org.ktorm.entity.*
import org.slf4j.LoggerFactory
import java.io.File
import java.io.InputStream
import java.io.OutputStream
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.util.zip.CRC32
import java.util.zip.ZipEntry
import java.util.zip.ZipFile
import java.util.zip.ZipOutputStream
import kotlin.io.path.Path

/**
 * 处理文件的后台任务。每当新建了新的File时，都应当在后台任务生成其缩略图，并解析其附加参数。
 */
interface FileGenerator : StatefulComponent, DaemonThreadComponent

private const val GENERATE_INTERVAL: Long = 50
private const val ARCHIVE_INTERVAL: Long = 1000 * 30

class FileGeneratorImpl(private val appStatus: AppStatusDriver,
                        private val appdata: AppDataManager,
                        private val data: DataRepository,
                        private val bus: EventBus) : FileGenerator {
    private val log = LoggerFactory.getLogger(FileGenerator::class.java)

    private val archiveQueue = mutableListOf<ArchiveQueueUnit>()
    private val thumbnailQueue = mutableListOf<Int>()
    private val fingerprintQueue = mutableListOf<Int>()

    private val archiveTask = loopPoolThread(thread = ::archiveDaemon)
    private val thumbnailTask = loopPoolThread(thread = ::thumbnailDaemon)
    private val fingerprintTask = loopPoolThread(thread = ::fingerprintDaemon)

    override val isIdle: Boolean get() = !thumbnailTask.isAlive && !fingerprintTask.isAlive && !archiveTask.isAlive

    init {
        bus.on(arrayOf(FileBlockArchived::class, FileMarkDeleted::class, FileMarkCreated::class), ::receiveEvents)
    }

    override fun thread() {
        //使用thread来初始化：初始化是异步进行的
        if(appStatus.status == AppLoadStatus.READY) {
            //读取status为NOT_READY的file，准备处理其缩略图
            val thumbnailTasks = data.db.from(FileRecords)
                .select(FileRecords.id)
                .where { FileRecords.status eq FileStatus.NOT_READY }
                .orderBy(FileRecords.updateTime.asc())
                .map { it[FileRecords.id]!! }
            if(thumbnailTasks.isNotEmpty()) {
                synchronized(thumbnailQueue) {
                    thumbnailQueue.addAll(thumbnailTasks)
                    thumbnailTask.start()
                }
            }

            //读取fingerStatus为NOT_READY的file，准备处理其指纹
            val fingerprintTasks = data.db.from(FileRecords)
                .select(FileRecords.id)
                .where { FileRecords.fingerStatus eq FingerprintStatus.NOT_READY }
                .orderBy(FileRecords.updateTime.asc())
                .map { it[FileRecords.id]!! }
            if(fingerprintTasks.isNotEmpty()) {
                synchronized(fingerprintQueue) {
                    fingerprintQueue.addAll(fingerprintTasks)
                    fingerprintTask.start()
                }
            }

            //读取deleted为true的file，准备在归档线程中将其删除
            val deletedTasks = data.db.from(FileRecords)
                .select(FileRecords.id, FileRecords.block)
                .where { FileRecords.deleted }
                .asSequence()
                .groupBy({ it[FileRecords.block]!! }) { it[FileRecords.id]!! }
            val archivedTasks = if(!appdata.storagePathAccessor.accessible) emptySet() else {
                val latestBlock = data.db.from(FileRecords)
                    .select(FileRecords.block)
                    .orderBy(FileRecords.id.desc())
                    .limit(1)
                    .map { it[FileRecords.block]!! }
                    .firstOrNull()
                //从存储位置读取所有的directory，准备在归档线程中将其归档
                //但是latestBlock总是除外，FileManager会管理它，并在它被归档时发出事件通知
                ArchiveType.values().asSequence().flatMap { archiveType ->
                    Path(appdata.storagePathAccessor.storageDir, archiveType.toString())
                        .toFile()
                        .listFiles { f -> f.isDirectory && f.name != latestBlock }
                        ?.asSequence()
                        ?: emptySequence()
                }.map { it.name }.toSet()
            }
            if(deletedTasks.isNotEmpty() || archivedTasks.isNotEmpty()) {
                synchronized(archiveQueue) {
                    archiveQueue.addAll((deletedTasks.keys + archivedTasks).asSequence().map { blockName ->
                        val toBeDeleted = deletedTasks[blockName]?.toMutableSet() ?: mutableSetOf()
                        val toBeArchived = blockName in archivedTasks
                        ArchiveQueueUnit(blockName, toBeDeleted, toBeArchived)
                    })
                    archiveTask.start()
                }
            }
        }
    }

    private fun receiveEvents(e: PackagedBusEvent) {
        for (event in e.events) {
            when (event.event) {
                is FileBlockArchived -> {
                    synchronized(archiveQueue) {
                        archiveQueue.find { it.block === event.event.block }?.also { it.toBeArchived = true }
                        ?: archiveQueue.add(ArchiveQueueUnit(event.event.block, mutableSetOf(), true))
                        archiveTask.start()
                    }
                }
                is FileMarkDeleted -> {
                    synchronized(archiveQueue) {
                        archiveQueue.find { it.block == event.event.block }?.toBeDeleted?.add(event.event.fileId)
                        ?: archiveQueue.add(ArchiveQueueUnit(event.event.block, mutableSetOf(event.event.fileId), false))
                        archiveTask.start()
                    }
                }
                is FileMarkCreated -> {
                    synchronized(thumbnailQueue) {
                        thumbnailQueue.add(event.event.fileId)
                        thumbnailTask.start()
                    }
                    synchronized(fingerprintQueue) {
                        fingerprintQueue.add(event.event.fileId)
                        fingerprintTask.start()
                    }
                }
            }
        }
    }

    private fun archiveDaemon() {
        try {
            //archive线程不需要立刻启动和频繁执行，保持一个稍长的间隔。
            Thread.sleep(ARCHIVE_INTERVAL)
        }catch (e: InterruptedException) {
            return
        }

        val (block, toBeDeleted, toBeArchived) = synchronized(archiveQueue) {
            if(archiveQueue.isNotEmpty()) {
                archiveQueue.removeAt(0)
            }else{
                archiveTask.stop()
                return
            }
        }

        if(!appdata.storagePathAccessor.accessible) {
            log.warn("File storage path ${appdata.storagePathAccessor.storageDir} is not accessible. Archive processor is paused.")
            return
        }

        try {
            if(toBeArchived) {
                //在进行归档处理前，先检查是否所有文件都已READY。如果存在NOT_READY的文件，则将任务放回队列，推迟任务。
                val anyNotReady = data.db.from(FileRecords)
                    .select((count(FileRecords.id) greater 0).aliased("any_not_ready"))
                    .where { FileRecords.deleted.not() and (FileRecords.block eq block) and ((FileRecords.status eq FileStatus.NOT_READY) or (FileRecords.fingerStatus eq FingerprintStatus.NOT_READY)) }
                    .first()
                    .getBoolean("any_not_ready")
                if(anyNotReady) {
                    synchronized(archiveQueue) {
                        archiveQueue.find { it.block == block }?.also { it.toBeDeleted.addAll(toBeDeleted); it.toBeArchived = true }
                            ?: archiveQueue.add(ArchiveQueueUnit(block, toBeDeleted, true))
                    }
                    return
                }
            }

            processBlockArchive(ArchiveType.SAMPLE, block, toBeDeleted, toBeArchived)
            processBlockArchive(ArchiveType.THUMBNAIL, block, toBeDeleted, toBeArchived)
            processBlockArchive(ArchiveType.ORIGINAL, block, toBeDeleted, toBeArchived)

            if(toBeDeleted.isNotEmpty()) {
                data.db.transaction {
                    data.db.delete(FileRecords) { it.id inList toBeDeleted and it.deleted }
                }
            }
        } catch (e: Exception) {
            log.error("Error occurred in archive task of block $block.", e)
        }
    }

    private fun thumbnailDaemon() {
        val fileId = synchronized(thumbnailQueue) {
            if(thumbnailQueue.isNotEmpty()) {
                thumbnailQueue.removeAt(0)
            }else{
                thumbnailTask.stop()
                return
            }
        }

        if(!appdata.storagePathAccessor.accessible) {
            log.warn("File storage path ${appdata.storagePathAccessor.storageDir} is not accessible. Thumbnail generator is paused.")
            return
        }

        try {
            val fileRecord = data.db.sequenceOf(FileRecords).firstOrNull { it.id eq fileId }
            if(fileRecord != null && fileRecord.status == FileStatus.NOT_READY) {
                val file = Path(appdata.storagePathAccessor.storageDir, ArchiveType.ORIGINAL.toString(), fileRecord.block, "${fileRecord.id}.${fileRecord.extension}").toFile()
                if(file.exists()) {
                    val (thumbnailFileSize, sampleFileSize, resolutionWidth, resolutionHeight) = processThumbnail(fileRecord, file)
                    val fileStatus = if(thumbnailFileSize != null) FileStatus.READY
                        else if(sampleFileSize != null) FileStatus.READY_WITHOUT_THUMBNAIL
                        else FileStatus.READY_WITHOUT_THUMBNAIL_SAMPLE
                    data.db.transaction {
                        data.db.update(FileRecords) {
                            where { it.id eq fileRecord.id }
                            set(it.status, fileStatus)
                            if(thumbnailFileSize != null) set(it.thumbnailSize, thumbnailFileSize)
                            if(sampleFileSize != null) set(it.sampleSize, sampleFileSize)
                            set(it.resolutionWidth, resolutionWidth)
                            set(it.resolutionHeight, resolutionHeight)
                        }
                    }

                    val importImageIds = data.db.from(ImportImages)
                        .select(ImportImages.id)
                        .where { ImportImages.fileId eq fileRecord.id }
                        .map { it[ImportImages.id]!! }
                    for (importImageId in importImageIds) {
                        bus.emit(ImportUpdated(importImageId, thumbnailFileReady = true))
                    }

                    Thread.sleep(GENERATE_INTERVAL)
                }else{
                    log.warn("Thumbnail generating failed because file ${file.absolutePath} not exists.")
                }
            }
        }catch (e: Exception) {
            log.error("Error occurred in thumbnail task of file $fileId.", e)
        }
    }

    private fun fingerprintDaemon() {
        val fileId = synchronized(fingerprintQueue) {
            if(fingerprintQueue.isNotEmpty()) {
                fingerprintQueue.removeAt(0)
            }else{
                fingerprintTask.stop()
                return
            }
        }

        if(!appdata.storagePathAccessor.accessible) {
            log.warn("File storage path ${appdata.storagePathAccessor.storageDir} is not accessible. Fingerprint generator is paused.")
            return
        }

        try {
            val fileRecord = data.db.sequenceOf(FileRecords).firstOrNull { it.id eq fileId }
            if(fileRecord != null && fileRecord.fingerStatus == FingerprintStatus.NOT_READY) {
                val file = Path(appdata.storagePathAccessor.storageDir, ArchiveType.ORIGINAL.toString(), fileRecord.block, "${fileRecord.id}.${fileRecord.extension}").toFile()
                if(file.exists()) {
                    val result = try { Similarity.process(file) }catch (e: BusinessException) {
                        if(e.exception is IllegalFileExtensionError) {
                            //忽略文件类型不支持的错误，且不生成指纹，直接退出
                            null
                        }else{
                            throw e
                        }
                    }

                    if(result != null) data.db.transaction {
                        data.db.insert(FileFingerprints) {
                            set(it.fileId, fileRecord.id)
                            set(it.createTime, DateTime.now())
                            set(it.pHashSimple, result.pHashSimple)
                            set(it.dHashSimple, result.dHashSimple)
                            set(it.pHash, result.pHash)
                            set(it.dHash, result.dHash)
                        }

                        data.db.update(FileRecords) {
                            where { it.id eq fileRecord.id }
                            set(it.fingerStatus, FingerprintStatus.READY)
                        }
                    }else{
                        data.db.update(FileRecords) {
                            where { it.id eq fileRecord.id }
                            set(it.fingerStatus, FingerprintStatus.NONE)
                        }
                    }

                    Thread.sleep(GENERATE_INTERVAL)
                }else{
                    log.warn("Fingerprint generating failed because file ${file.absolutePath} not exists.")
                }
            }
        }catch (e: Exception) {
            log.error("Error occurred in fingerprint task of file $fileId.", e)
        }
    }

    private fun processThumbnail(fileRecord: FileRecord, file: File): Tuple4<Long?, Long?, Int, Int> {
        //生成thumbnail。当file为除jpg外的其他格式，或file尺寸高于阈值时，会生成thumbnail。
        val (thumbnailTempFile, resolutionWidth, resolutionHeight) = Graphics.process(file, Graphics.THUMBNAIL_RESIZE_AREA)
        //生成sample。由于传入必定是jpg格式，当file尺寸高于阈值时，会生成thumbnail。
        val (sampleTempFile, _, _) = Graphics.process(thumbnailTempFile ?: file, Graphics.SAMPLE_RESIZE_AREA)

        //实际上，当尺寸小于sample且类型为jpg时，可以只生成thumbnail而不生成sample。
        //此时，需要把thumbnail当作sample去处理。即，sample总是优先于thumbnail。
        val thumbnailFileSize = if(thumbnailTempFile != null && sampleTempFile != null) {
            val thumbnailPath = Path(appdata.storagePathAccessor.storageDir, ArchiveType.THUMBNAIL.toString(), fileRecord.block, "${fileRecord.id}.jpg")
            val thumbnailFile = thumbnailPath.toFile()
            val fileSize = thumbnailTempFile.length()
            try {
                thumbnailFile.parentFile.mkdirs()
                Files.move(thumbnailTempFile.toPath(), thumbnailPath, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE)
            }catch (e: Exception) {
                thumbnailFile.deleteIfExists()
                throw e
            } finally {
                thumbnailTempFile.deleteIfExists()
            }
            fileSize
        }else{
            null
        }
        val sampleFileSize = if(sampleTempFile != null) {
            val samplePath = Path(appdata.storagePathAccessor.storageDir, ArchiveType.SAMPLE.toString(), fileRecord.block, "${fileRecord.id}.jpg")
            val sampleFile = samplePath.toFile()
            val fileSize = sampleTempFile.length()
            try {
                sampleFile.parentFile.mkdirs()
                Files.move(sampleTempFile.toPath(), samplePath, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE)
            }catch (e: Exception) {
                sampleFile.deleteIfExists()
                throw e
            } finally {
                sampleTempFile.deleteIfExists()
            }
            fileSize
        }else if (thumbnailTempFile != null) {
            val samplePath = Path(appdata.storagePathAccessor.storageDir, ArchiveType.SAMPLE.toString(), fileRecord.block, "${fileRecord.id}.jpg")
            val sampleFile = samplePath.toFile()
            val fileSize = thumbnailTempFile.length()
            try {
                sampleFile.parentFile.mkdirs()
                Files.move(thumbnailTempFile.toPath(), samplePath, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE)
            }catch (e: Exception) {
                sampleFile.deleteIfExists()
                throw e
            } finally {
                thumbnailTempFile.deleteIfExists()
            }
            fileSize
        }else{
            null
        }
        return Tuple4(thumbnailFileSize, sampleFileSize, resolutionWidth, resolutionHeight)
    }

    private fun processBlockArchive(archiveType: ArchiveType, block: String, toBeDeleted: Set<Int>, toBeArchived: Boolean) {
        val tmpZipPath = Path(appdata.storagePathAccessor.storageDir, archiveType.toString(), "$block.tmp.zip")
        val finalZipPath = Path(appdata.storagePathAccessor.storageDir, archiveType.toString(), "$block.zip")
        val oldZipPath = Path(appdata.storagePathAccessor.storageDir, archiveType.toString(), "$block.zip")
        val dirPath = Path(appdata.storagePathAccessor.storageDir, archiveType.toString(), block)
        val cacheDirPath = Path(appdata.storagePathAccessor.cacheDir, archiveType.toString(), block)

        val oldZip = oldZipPath.toFile().takeIf { it.exists() }?.let(::ZipFile)
        val dir = dirPath.toFile().takeIf { it.isDirectory }
        val tmpZip = tmpZipPath.toFile()

        if(oldZip == null && dir == null) {
            //skip it
        }else if(oldZip == null && !toBeArchived) {
            //如果toBeArchived为否，且并不存在之前的旧归档zip，那么此时不应该执行归档动作，只是删除文件。
            var deletedInDirCount = 0
            dir!!.run {
                val toBeDeletedStr = toBeDeleted.asSequence().map { it.toString() }.toSet()
                listFiles { f -> f.nameWithoutExtension in toBeDeletedStr }?.forEach {
                    it.deleteIfExists()
                    deletedInDirCount += 1
                }
            }
            log.info("Block $archiveType/$block is cleaned. $deletedInDirCount files-in-dir deleted.")
        }else{
            var addedFromZipCount = 0
            var addedFromDirCount = 0
            var deletedInZipCount = 0
            var deletedInDirCount = 0
            ZipOutputStream(tmpZip.outputStream()).use { zos ->
                zos.setMethod(ZipOutputStream.STORED)

                if(oldZip != null) {
                    for (entry in oldZip.entries()) {
                        val nameWithoutExtension = entry.name.substringBeforeLast('.')
                        val fileId = nameWithoutExtension.toInt()
                        if(fileId !in toBeDeleted) {
                            zos.putEntry(entry, oldZip.getInputStream(entry))
                            addedFromZipCount += 1
                        }else{
                            deletedInZipCount += 1
                        }
                    }
                }
                if(dir != null) {
                    for (file in dir.listFiles()!!) {
                        val fileId = file.nameWithoutExtension.toInt()
                        if(fileId !in toBeDeleted) {
                            zos.putFile(file)
                            addedFromDirCount += 1
                        }else{
                            deletedInDirCount += 1
                        }
                    }
                }
            }

            if(addedFromDirCount > 0 || addedFromZipCount > 0) {
                //存在任意文件被添加到zip时，将tmp.zip移动到final位置转正
                Files.move(tmpZipPath, finalZipPath, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE)
            }else{
                //不存在任何文件被添加时，tmp.zip和现存的正式zip都要被删除
                tmpZip.deleteIfExists()
                finalZipPath.toFile().deleteIfExists()
            }
            //删除dir目录，toBeDeleted的项因为不会被归档，所以在这一步被删除了
            dir?.deleteRecursively()
            //清理缓存目录下的toBeDeleted文件
            cacheDirPath.toFile().takeIf { it.isDirectory }?.run {
                val toBeDeletedStr = toBeDeleted.asSequence().map { it.toString() }.toSet()
                listFiles { f -> f.nameWithoutExtension in toBeDeletedStr }?.forEach { it.deleteIfExists() }
            }

            log.info("Block $archiveType/$block is ${if(addedFromZipCount > 0 || deletedInZipCount > 0) "re-archived" else "archived"}. ${
                sequenceOf(
                    addedFromZipCount.takeIf { it > 0 }?.let { "$it files-from-zip added" },
                    addedFromDirCount.takeIf { it > 0 }?.let { "$it files-from-dir added" },
                    deletedInZipCount.takeIf { it > 0 }?.let { "$it files-in-zip deleted" },
                    deletedInDirCount.takeIf { it > 0 }?.let { "$it files-in-dir deleted" }
                ).filterNotNull().joinToString()
            }")
        }
    }
}

private data class ArchiveQueueUnit(val block: String, val toBeDeleted: MutableSet<Int>, var toBeArchived: Boolean)

fun ZipOutputStream.putFile(file: File) {
    val entry = ZipEntry(file.name)
    entry.time = file.lastModified()
    entry.crc = CRC32().let { crc32 ->
        file.inputStream().use { fis -> fis.writeTo(crc32) }
        crc32.value
    }
    entry.size = file.length()

    this.putNextEntry(entry)

    file.inputStream().use { fis -> fis.writeTo(this) }

    this.closeEntry()
}

fun ZipOutputStream.putEntry(entry: ZipEntry, inputStream: InputStream) {
    this.putNextEntry(entry)
    inputStream.writeTo(this)
    this.closeEntry()
}

fun InputStream.writeTo(os: OutputStream) {
    var len: Int
    val buffer = ByteArray(1024 * 1024 * 4)
    while(this.read(buffer).also { len = it } != -1) {
        os.write(buffer, 0, len)
    }
}

fun InputStream.writeTo(os: CRC32) {
    var len: Int
    val buffer = ByteArray(1024 * 1024 * 4)
    while(this.read(buffer).also { len = it } != -1) {
        os.update(buffer, 0, len)
    }
}