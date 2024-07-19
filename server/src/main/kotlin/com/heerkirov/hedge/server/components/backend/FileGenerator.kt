package com.heerkirov.hedge.server.components.backend

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.components.status.AppStatusDriver
import com.heerkirov.hedge.server.dao.FileCacheRecords
import com.heerkirov.hedge.server.dao.FileFingerprints
import com.heerkirov.hedge.server.dao.FileRecords
import com.heerkirov.hedge.server.dao.TrashedImages
import com.heerkirov.hedge.server.enums.AppLoadStatus
import com.heerkirov.hedge.server.enums.ArchiveType
import com.heerkirov.hedge.server.enums.FileStatus
import com.heerkirov.hedge.server.enums.FingerprintStatus
import com.heerkirov.hedge.server.events.*
import com.heerkirov.hedge.server.exceptions.BusinessException
import com.heerkirov.hedge.server.exceptions.IllegalFileExtensionError
import com.heerkirov.hedge.server.functions.manager.TrashManager
import com.heerkirov.hedge.server.library.framework.DaemonThreadComponent
import com.heerkirov.hedge.server.model.FileRecord
import com.heerkirov.hedge.server.utils.*
import com.heerkirov.hedge.server.utils.DateTime.toPartitionDate
import com.heerkirov.hedge.server.utils.ktorm.asSequence
import com.heerkirov.hedge.server.utils.ktorm.first
import com.heerkirov.hedge.server.utils.tools.loopPoolThread
import com.heerkirov.hedge.server.utils.tools.assignmentTask
import org.ktorm.dsl.*
import org.ktorm.entity.*
import org.slf4j.LoggerFactory
import java.io.File
import java.io.InputStream
import java.io.OutputStream
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.time.Instant
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import java.util.LinkedList
import java.util.zip.CRC32
import java.util.zip.ZipEntry
import java.util.zip.ZipFile
import java.util.zip.ZipOutputStream
import kotlin.io.path.Path
import kotlin.io.path.deleteIfExists
import kotlin.math.absoluteValue

/**
 * 处理文件的后台任务。
 * - 每当添加了新的文件时，都在后台任务生成其缩略图，并解析其附加参数。
 * - 每当缩略图处理完成时，生成其指纹。
 * - 每当触发区块归档事件时，都在后台任务处理区块的归档。
 * - 程序启动时，扫描并清理所有已删除的文件，一并处理归档。
 * - 程序启动时，在后台检测并清理缓存文件。
 * - 已删除文件的自动清理。根据自动清理间隔，与当前时间间隔超出此日数的项会被清除。
 */
interface FileGenerator

private const val ARCHIVE_INTERVAL: Long = 2000

class FileGeneratorImpl(private val appStatus: AppStatusDriver,
                        private val appdata: AppDataManager,
                        private val data: DataRepository,
                        private val bus: EventBus, taskBus: BackgroundTaskBus,
                        private val trashManager: TrashManager) : FileGenerator, DaemonThreadComponent {
    private val log = LoggerFactory.getLogger(FileGenerator::class.java)

    private val archiveQueue = LinkedList<ArchiveQueueUnit>()
    private val archiveTask = loopPoolThread(thread = ::archiveDaemon)
    private val thumbnailTask = assignmentTask(thread = ::thumbnailDaemon, poolSize = Runtime.getRuntime().availableProcessors())
    private val fingerprintTask = assignmentTask(thread = ::fingerprintDaemon, poolSize = Runtime.getRuntime().availableProcessors() / 2)

    private val archiveCounter = taskBus.counter(BackgroundTaskType.FILE_ARCHIVE)
    private val generateCounter = taskBus.counter(BackgroundTaskType.FILE_GENERATE)

    init {
        bus.on(arrayOf(FileBlockArchived::class, FileCreated::class), ::receiveEvents)
    }

    override fun thread() {
        //使用thread来初始化：初始化是异步进行的
        if(appStatus.status == AppLoadStatus.READY) {
            Thread.sleep(1000)
            cleanTrashedImages()

            //读取status为NOT_READY的file，准备处理其缩略图
            val thumbnailTasks = data.db.from(FileRecords)
                .select(FileRecords.id)
                .where { FileRecords.status eq FileStatus.NOT_READY and FileRecords.deleted.not() }
                .orderBy(FileRecords.updateTime.asc())
                .map { it[FileRecords.id]!! }
            if(thumbnailTasks.isNotEmpty()) {
                thumbnailTask.addAll(thumbnailTasks)
                generateCounter.addTotal(thumbnailTasks.size)
            }

            //读取fingerStatus为NOT_READY且status不为NOT_READY的file，准备处理其指纹
            val fingerprintTasks = data.db.from(FileRecords)
                .select(FileRecords.id)
                .where { FileRecords.fingerStatus eq FingerprintStatus.NOT_READY and (FileRecords.status notEq FileStatus.NOT_READY) and FileRecords.deleted.not() }
                .orderBy(FileRecords.updateTime.asc())
                .map { it[FileRecords.id]!! }
            if(fingerprintTasks.isNotEmpty()) {
                fingerprintTask.addAll(fingerprintTasks)
                generateCounter.addTotal(fingerprintTasks.size)
            }

            //读取deleted为true的file，准备在归档线程中将其删除
            val anyDeletedBlocks = data.db.from(FileRecords)
                .select(FileRecords.block, count(FileRecords.id).aliased("count"))
                .where { FileRecords.deleted }
                .groupBy(FileRecords.block)
                .having { count(FileRecords.id).aliased("count") greater 0 }
                .asSequence()
                .map { it[FileRecords.block]!! }
                .toSet()
            val toBeArchivedBlocks = if(!appdata.storage.accessible) emptySet() else {
                val latestBlock = data.db.from(FileRecords)
                    .select(FileRecords.block)
                    .orderBy(FileRecords.id.desc())
                    .limit(1)
                    .map { it[FileRecords.block]!! }
                    .firstOrNull()
                    ?.toInt(16)
                    ?: 1
                //从存储位置读取所有的directory，准备在归档线程中将其归档
                //筛选掉比latestBlock大的块，包括latestBlock。FileManager会管理latestBlock，并在它被归档时发出事件通知
                ArchiveType.entries.asSequence().flatMap { archiveType ->
                    Path(appdata.storage.storageDir, archiveType.toString())
                        .toFile()
                        .listFiles { f -> f.isDirectory && (f.name.toIntOrNull(16)?.let { it < latestBlock } ?: false) }
                        ?.asSequence()
                        ?: emptySequence()
                }.map { it.name }.toSet()
            }
            if(anyDeletedBlocks.isNotEmpty() || toBeArchivedBlocks.isNotEmpty()) {
                synchronized(archiveQueue) {
                    val blocks = anyDeletedBlocks + toBeArchivedBlocks
                    archiveQueue.addAll(blocks.map { blockName ->
                        val toBeArchived = blockName in toBeArchivedBlocks
                        ArchiveQueueUnit(blockName, toBeArchived)
                    })
                    archiveTask.start()
                    archiveCounter.addTotal(blocks.size)
                }
            }

            cleanExpiredCacheFiles()
        }
    }

    private fun receiveEvents(e: PackagedBusEvent) {
        e.which {
            all<FileBlockArchived> { events ->
                synchronized(archiveQueue) {
                    for(event in events) {
                        val existedBlock = archiveQueue.find { it.block == event.block }
                        if(existedBlock != null) {
                            existedBlock.toBeArchived = true
                        }else{
                            archiveQueue.add(ArchiveQueueUnit(event.block, toBeArchived = true))
                            archiveCounter.addTotal(1)
                        }
                    }
                    archiveTask.start()
                }
            }
            all<FileCreated> { events ->
                thumbnailTask.addAll(events.map { it.fileId })
                generateCounter.addTotal(events.size)
            }
        }
    }

    private fun archiveDaemon() {
        try {
            Thread.sleep(ARCHIVE_INTERVAL)
        }catch (e: InterruptedException) {
            return
        }

        val (block, toBeArchived) = synchronized(archiveQueue) {
            if(archiveQueue.isNotEmpty()) {
                archiveQueue.removeAt(0)
            }else{
                archiveTask.stop()
                return
            }
        }

        if(!appdata.storage.accessible) {
            log.warn("File storage path ${appdata.storage.storageDir} is not accessible. Archive processor is paused.")
            return
        }

        try {
            //在进行处理前，先检查是否所有文件都已READY。如果存在NOT_READY的文件，则将任务放回队列，推迟任务。
            //这确实有可能造成已删除文件的清理延后，但按照文件process的速度，这完全可以接受。
            val anyNotReady = data.db.from(FileRecords)
                .select((count(FileRecords.id) greater 0).aliased("any_not_ready"))
                .where { FileRecords.deleted.not() and (FileRecords.block eq block) and ((FileRecords.status eq FileStatus.NOT_READY) or (FileRecords.fingerStatus eq FingerprintStatus.NOT_READY)) }
                .first()
                .getBoolean("any_not_ready")
            if(anyNotReady) {
                synchronized(archiveQueue) {
                    archiveQueue.find { it.block == block }
                        ?.also { if(toBeArchived) it.toBeArchived = true }
                        ?: archiveQueue.add(ArchiveQueueUnit(block, toBeArchived))
                }
                return
            }
            val toBeDeletedFiles = data.db.from(FileRecords)
                .select(FileRecords.id)
                .where { FileRecords.deleted and (FileRecords.block eq block) }
                .asSequence()
                .map { it[FileRecords.id]!! }
                .toSet()

            processBlockArchive(ArchiveType.SAMPLE, block, toBeDeletedFiles, toBeArchived)
            processBlockArchive(ArchiveType.THUMBNAIL, block, toBeDeletedFiles, toBeArchived)
            processBlockArchive(ArchiveType.ORIGINAL, block, toBeDeletedFiles, toBeArchived)

            if(toBeDeletedFiles.isNotEmpty()) {
                data.db.transaction {
                    data.db.delete(FileRecords) { it.id inList toBeDeletedFiles and it.deleted }
                    data.db.delete(FileCacheRecords) { it.fileId inList toBeDeletedFiles }
                }
            }
        } catch (e: Exception) {
            log.error("Error occurred in archive task of block $block.", e)
        } finally {
            archiveCounter.addCount(1)
        }
    }

    private fun thumbnailDaemon(fileId: Int) {
        if(!appdata.storage.accessible) {
            log.warn("File storage path ${appdata.storage.storageDir} is not accessible. Thumbnail generator is paused.")
            bus.emit(FileProcessError(fileId, "THUMBNAIL", "File storage path is not accessible."))
            return
        }

        try {
            val fileRecord = data.db.sequenceOf(FileRecords).firstOrNull { it.id eq fileId }
            if(fileRecord != null) {
                if(fileRecord.status == FileStatus.NOT_READY) {
                    val file = Path(appdata.storage.storageDir, ArchiveType.ORIGINAL.toString(), fileRecord.block, "${fileRecord.id}.${fileRecord.extension}").toFile()
                    if(file.exists()) {
                        val (thumbnailFileSize, sampleFileSize, resolutionWidth, resolutionHeight, videoDuration) = processThumbnail(fileRecord, file)
                        val fileStatus = if(thumbnailFileSize != null) FileStatus.READY
                            else if(sampleFileSize != null) FileStatus.READY_WITHOUT_THUMBNAIL
                            else FileStatus.READY_WITHOUT_THUMBNAIL_SAMPLE
                        data.db.transaction {
                            data.db.update(FileRecords) {
                                where { it.id eq fileRecord.id }
                                set(it.status, fileStatus)
                                if(thumbnailFileSize != null) set(it.thumbnailSize, thumbnailFileSize)
                                if(sampleFileSize != null) set(it.sampleSize, sampleFileSize)
                                if(videoDuration != null) set(it.videoDuration, videoDuration)
                                set(it.resolutionWidth, resolutionWidth)
                                set(it.resolutionHeight, resolutionHeight)
                            }
                        }

                        fingerprintTask.add(fileRecord.id)
                    }else{
                        log.warn("Thumbnail generating failed because file ${file.absolutePath} not exists.")
                        bus.emit(FileProcessError(fileId, "THUMBNAIL", "Thumbnail generating failed because file ${file.absolutePath} not exists."))
                    }
                }else{
                    fingerprintTask.add(fileRecord.id)
                }
            }
        }catch (e: Exception) {
            log.error("Error occurred in thumbnail task of file $fileId.", e)
            bus.emit(FileProcessError(fileId, "THUMBNAIL", e.message ?: ""))
            generateCounter.addCount(1)
        }
    }

    private fun fingerprintDaemon(fileId: Int) {
        if(!appdata.storage.accessible) {
            log.warn("File storage path ${appdata.storage.storageDir} is not accessible. Fingerprint generator is paused.")
            bus.emit(FileProcessError(fileId, "FINGERPRINT", "File storage path is not accessible."))
            return
        }

        try {
            val fileRecord = data.db.sequenceOf(FileRecords).firstOrNull { it.id eq fileId }
            if(fileRecord != null) {
                if(fileRecord.fingerStatus == FingerprintStatus.NOT_READY && fileRecord.status != FileStatus.NOT_READY) {
                    val file = if(fileRecord.status == FileStatus.READY_WITHOUT_THUMBNAIL_SAMPLE) {
                        Path(appdata.storage.storageDir, ArchiveType.ORIGINAL.toString(), fileRecord.block, "${fileRecord.id}.${fileRecord.extension}").toFile()
                    }else{
                        Path(appdata.storage.storageDir, ArchiveType.SAMPLE.toString(), fileRecord.block, "${fileRecord.id}.jpg").toFile()
                    }

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
                                set(it.createTime, Instant.now())
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
                        bus.emit(FileReady(fileId))
                    }else{
                        log.warn("Fingerprint generating failed because file ${file.absolutePath} not exists.")
                        bus.emit(FileProcessError(fileId, "FINGERPRINT", "Fingerprint generating failed because file ${file.absolutePath} not exists."))
                    }
                }else if(fileRecord.fingerStatus != FingerprintStatus.NOT_READY) {
                    bus.emit(FileReady(fileId))
                }
            }
        }catch (e: Exception) {
            log.error("Error occurred in fingerprint task of file $fileId.", e)
            bus.emit(FileProcessError(fileId, "FINGERPRINT", e.message ?: ""))
        }finally {
            generateCounter.addCount(1)
        }
    }

    private fun cleanTrashedImages() {
        if(appdata.setting.storage.autoCleanTrashes) {
            if(!appdata.storage.accessible) {
                log.warn("cleanTrashedImages not executed, because storage dir is not accessible.")
                return
            }

            val deadline = Instant.now()
                .toPartitionDate(appdata.setting.server.timeOffsetHour)
                .minus(appdata.setting.storage.autoCleanTrashesIntervalDay.absoluteValue.toLong(), ChronoUnit.DAYS)
                .let { LocalDateTime.of(it, LocalTime.MIN).atZone(ZoneId.systemDefault()).toInstant() }
            val imageIds = data.db.from(TrashedImages)
                .select(TrashedImages.imageId)
                .where { TrashedImages.trashedTime lessEq deadline }
                .map { it[TrashedImages.imageId]!! }

            trashManager.deleteTrashedImage(imageIds)

            if(imageIds.isNotEmpty()) {
                log.info("${imageIds.size} trashed images have been cleared.")
            }
        }
    }

    private fun cleanExpiredCacheFiles() {
        if(appdata.setting.storage.autoCleanCaches) {
            val intervalDay = appdata.setting.storage.autoCleanCachesIntervalDay
            val deadline = Instant.now().minus(intervalDay.absoluteValue.toLong(), ChronoUnit.DAYS)
            for (record in data.db.sequenceOf(FileCacheRecords).filter { it.lastAccessTime lessEq deadline }) {
                val cachePath = Path(appdata.storage.cacheDir, record.archiveType.toString(), record.block, record.filename)
                cachePath.deleteIfExists()
            }
            val cnt = data.db.delete(FileCacheRecords) { it.lastAccessTime lessEq deadline }
            if(cnt > 0) log.info("$cnt cache files have been cleaned.")
        }
    }

    private fun processThumbnail(fileRecord: FileRecord, file: File): Tuple5<Long?, Long?, Int, Int, Long?> {
        //生成thumbnail。当file为除jpg外的其他格式，或file尺寸高于阈值时，会生成thumbnail。
        val (thumbnailTempFile, resolutionWidth, resolutionHeight, videoDuration) = Graphics.generateThumbnail(file, Graphics.THUMBNAIL_RESIZE_AREA)
        //生成sample。由于传入必定是jpg格式，当file尺寸高于阈值时，会生成thumbnail。
        val (sampleTempFile, _, _, _) = Graphics.generateThumbnail(thumbnailTempFile ?: file, Graphics.SAMPLE_RESIZE_AREA)

        //实际上，当尺寸小于sample且类型为jpg时，可以只生成thumbnail而不生成sample。
        //此时，需要把thumbnail当作sample去处理。即，sample总是优先于thumbnail。
        val thumbnailFileSize = if(thumbnailTempFile != null && sampleTempFile != null) {
            val thumbnailPath = Path(appdata.storage.storageDir, ArchiveType.THUMBNAIL.toString(), fileRecord.block, "${fileRecord.id}.jpg")
            val thumbnailFile = thumbnailPath.toFile()
            val fileSize = thumbnailTempFile.length()
            try {
                thumbnailFile.parentFile.mkdirs()
                Files.move(thumbnailTempFile.toPath(), thumbnailPath, StandardCopyOption.REPLACE_EXISTING)
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
            val samplePath = Path(appdata.storage.storageDir, ArchiveType.SAMPLE.toString(), fileRecord.block, "${fileRecord.id}.jpg")
            val sampleFile = samplePath.toFile()
            val fileSize = sampleTempFile.length()
            try {
                sampleFile.parentFile.mkdirs()
                Files.move(sampleTempFile.toPath(), samplePath, StandardCopyOption.REPLACE_EXISTING)
            }catch (e: Exception) {
                sampleFile.deleteIfExists()
                throw e
            } finally {
                sampleTempFile.deleteIfExists()
            }
            fileSize
        }else if (thumbnailTempFile != null) {
            val samplePath = Path(appdata.storage.storageDir, ArchiveType.SAMPLE.toString(), fileRecord.block, "${fileRecord.id}.jpg")
            val sampleFile = samplePath.toFile()
            val fileSize = thumbnailTempFile.length()
            try {
                sampleFile.parentFile.mkdirs()
                Files.move(thumbnailTempFile.toPath(), samplePath, StandardCopyOption.REPLACE_EXISTING)
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
        return Tuple5(thumbnailFileSize, sampleFileSize, resolutionWidth, resolutionHeight, videoDuration)
    }

    private fun processBlockArchive(archiveType: ArchiveType, block: String, toBeDeleted: Set<Int>, toBeArchived: Boolean) {
        val tmpZipPath = Path(appdata.storage.storageDir, archiveType.toString(), "$block.tmp.zip")
        val finalZipPath = Path(appdata.storage.storageDir, archiveType.toString(), "$block.zip")
        val oldZipPath = Path(appdata.storage.storageDir, archiveType.toString(), "$block.zip")
        val dirPath = Path(appdata.storage.storageDir, archiveType.toString(), block)
        val cacheDirPath = Path(appdata.storage.cacheDir, archiveType.toString(), block)

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
            log.info("Block $archiveType/$block cleaned. $deletedInDirCount files-in-dir deleted.")
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
                        if(!file.name.startsWith(".")) {
                            try {
                                val fileId = file.nameWithoutExtension.toInt()
                                if(fileId !in toBeDeleted) {
                                    zos.putFile(file)
                                    addedFromDirCount += 1
                                }else{
                                    deletedInDirCount += 1
                                }
                            }catch (e: NumberFormatException) {
                                log.error("Filename cast error.", e)
                            }
                        }
                    }
                }
            }

            if(addedFromDirCount > 0 || addedFromZipCount > 0) {
                //存在任意文件被添加到zip时，将tmp.zip移动到final位置转正
                //此处可以使用ATOMIC_MOVE，因为可以保证tmp zip和final zip位于同一个分区
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

            log.info("Block $archiveType/$block ${if(addedFromZipCount > 0 || deletedInZipCount > 0) "re-archived" else "archived"}. ${
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

private data class ArchiveQueueUnit(val block: String, var toBeArchived: Boolean)

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