package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.enums.ArchiveType
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.constants.Filename
import com.heerkirov.hedge.server.dao.FileCacheRecords
import com.heerkirov.hedge.server.dao.FileFingerprints
import com.heerkirov.hedge.server.dao.FileRecords
import com.heerkirov.hedge.server.enums.FileStatus
import com.heerkirov.hedge.server.enums.FingerprintStatus
import com.heerkirov.hedge.server.events.FileBlockArchived
import com.heerkirov.hedge.server.events.FileMarkDeleted
import com.heerkirov.hedge.server.exceptions.IllegalFileExtensionError
import com.heerkirov.hedge.server.exceptions.StorageNotAccessibleError
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.library.framework.DaemonThreadComponent
import com.heerkirov.hedge.server.library.framework.StatefulComponent
import com.heerkirov.hedge.server.model.FileCacheRecord
import com.heerkirov.hedge.server.utils.*
import com.heerkirov.hedge.server.utils.ktorm.first
import org.ktorm.dsl.*
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import org.ktorm.support.sqlite.bulkInsertOrUpdate
import java.io.File
import java.io.InputStream
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.time.LocalDateTime
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.zip.ZipFile
import kotlin.io.path.Path

class FileManager(private val appdata: AppDataManager, private val data: DataRepository, private val bus: EventBus): StatefulComponent, DaemonThreadComponent {
    private val extensions = arrayOf("jpeg", "jpg", "png", "gif", "mp4", "webm")

    private val nextBlock = NextBlock()

    private val cacheRecord = CacheRecord()

    override val isIdle: Boolean get() = cacheRecord.isIdle

    override fun thread() = cacheRecord.daemonThread()

    /**
     * 将指定的File载入到数据库中，同时创建一条新记录。
     * - folder指定为文件的更改日期(UTC)。对于上传的文件，这就相当于取了导入日期。
     * - extension指定为此file的扩展名。
     * - thumbnail和大小等信息留白，处于NOT READY状态，需要调用FileGenerator生成这些信息。
     * @param moveFile 使用移动的方式导入文件。
     * @return file id。使用此id来索引物理文件记录。
     * @throws StorageNotAccessibleError 存储路径不可访问
     * @throws IllegalFileExtensionError (extension) 此文件扩展名不受支持
     */
    fun newFile(file: File, filename: String, moveFile: Boolean = false): Int {
        if(!appdata.storage.accessible) throw be(StorageNotAccessibleError(appdata.storage.storageDir))

        val now = DateTime.now()
        val extension = validateExtension(file.extension)

        val block = nextBlock.nextBlock(file.length())

        val id = data.db.insertAndGenerateKey(FileRecords) {
            set(it.block, block)
            set(it.extension, extension)
            set(it.size, file.length())
            set(it.thumbnailSize, 0)
            set(it.sampleSize, 0)
            set(it.resolutionWidth, 0)
            set(it.resolutionHeight, 0)
            set(it.videoDuration, 0)
            set(it.originFilename, filename)
            set(it.status, FileStatus.NOT_READY)
            set(it.fingerStatus, FingerprintStatus.NOT_READY)
            set(it.deleted, false)
            set(it.createTime, now)
            set(it.updateTime, now)
        } as Int

        val targetFile = Path(appdata.storage.storageDir, ArchiveType.ORIGINAL.toString(), block, "$id.$extension").toFile()

        targetFile.parentFile.mkdirs()

        if(moveFile) {
            Files.move(file.toPath(), targetFile.toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE)
        }else try {
            file.copyTo(targetFile, overwrite = true)
        }catch (e: Exception) {
            targetFile.deleteIfExists()
            throw e
        }

        nextBlock.addSizeAndCount(block, file.length())

        return id
    }

    /**
     * 撤销文件的新建操作。
     * - 删除文件记录。
     * - 如果文件被移动，那么移动回去；如果文件被复制，那么删除文件。
     * - 如果缩略图已完成，那么删除缩略图。
     */
    fun undoFile(importFile: File, fileId: Int, moveFile: Boolean = false) {
        if(!appdata.storage.accessible) throw be(StorageNotAccessibleError(appdata.storage.storageDir))

        val fileRecord = data.db.sequenceOf(FileRecords).firstOrNull { it.id eq fileId } ?: return

        val file = Path(appdata.storage.storageDir, ArchiveType.ORIGINAL.toString(), fileRecord.block, "$fileId.${fileRecord.extension}").toFile()
        if(moveFile) {
            Files.move(file.toPath(), importFile.toPath())
        }else{
            file.delete()
        }

        nextBlock.delSizeAndCount(fileRecord.block, fileRecord.size)

        data.db.delete(FileRecords) { it.id eq fileId }
    }

    /**
     * 删除一个文件。
     * 它会将FileRecord标记为deleted，不可用，等待归档线程将其回收。
     */
    fun deleteFile(fileId: Int) {
        if(!appdata.storage.accessible) throw be(StorageNotAccessibleError(appdata.storage.storageDir))

        val file = data.db.sequenceOf(FileRecords).firstOrNull { it.id eq fileId } ?: return

        data.db.delete(FileFingerprints) { it.fileId eq fileId }

        data.db.update(FileRecords) {
            where { it.id eq fileId }
            set(it.deleted, true)
        }

        nextBlock.delSizeAndCount(file.block, file.size)

        //发送一个file已删除的通知，告知FileProcessor有新的删除文件要处理
        bus.emit(FileMarkDeleted(fileId, file.block))
    }

    /**
     * 从缓存读取一个文件，如果该文件不在缓存，则将其加载到缓存。
     */
    fun load(archiveType: ArchiveType, block: String, filename: String): Path? {
        if(!appdata.storage.accessible) {
            return null
        }
        val cachePath = Path(appdata.storage.cacheDir, archiveType.toString(), block, filename)
        val cacheFile = cachePath.toFile()
        if(cacheFile.exists()) {
            cacheRecord.addAccessRecord(archiveType, block, filename)
            return cachePath
        }

        val directPath = Path(appdata.storage.storageDir, archiveType.toString(), block, filename)
        val directFile = directPath.toFile()
        if(directFile.exists()) {
            return directPath
        }

        val zipFile = Path(appdata.storage.storageDir, archiveType.toString(), "$block.zip").toFile()
        if(zipFile.exists()) {
            val zip = ZipFile(zipFile)
            val entry = zip.getEntry(filename)
            if(entry != null) {
                cacheFile.parentFile.mkdirs()

                zip.getInputStream(entry).use { fis ->
                    Files.copy(fis, cachePath, StandardCopyOption.REPLACE_EXISTING)
                }

                cacheRecord.addAccessRecord(archiveType, block, filename)
                return cachePath
            }
        }

        return null
    }

    /**
     * 从存档读取一个文件的内容，并输出至inputStream。
     */
    fun readInputStream(archiveType: ArchiveType, block: String, filename: String): InputStream? {
        val zipFile = Path(appdata.storage.storageDir, archiveType.toString(), "$block.zip").toFile()
        if(zipFile.exists()) {
            val zip = ZipFile(zipFile)
            val entry = zip.getEntry(filename)
            if(entry != null) {
                return zip.getInputStream(entry)
            }
        }

        val directPath = Path(appdata.storage.storageDir, archiveType.toString(), block, filename)
        val directFile = directPath.toFile()
        if(directFile.exists()) {
            return directFile.inputStream()
        }

        return null
    }

    /**
     * 检查并纠正一个文件的扩展名。扩展名必须是受支持的扩展名，且统一转换为小写。
     * @throws IllegalFileExtensionError (extension) 此文件扩展名不受支持
     */
    private fun validateExtension(extension: String): String {
        return extension.lowercase().apply {
            if(this !in extensions) throw be(IllegalFileExtensionError(extension))
        }
    }

    /**
     * next block记录模块。
     */
    private inner class NextBlock {
        private val pool = Executors.newSingleThreadExecutor()

        @Volatile var index: Int? = null; private set
        @Volatile var name: String? = null; private set
        @Volatile var count: Int = 0; private set
        @Volatile var size: Long = 0L; private set

        private fun initialize() {
            //查找最后一条File记录，获取最新的block name
            val latestBlock = data.db.from(FileRecords)
                .select(FileRecords.block)
                .orderBy(FileRecords.id.desc())
                .limit(1)
                .map { it[FileRecords.block]!! }
                .firstOrNull()
            if(latestBlock != null) {
                //成功取得记录，则使用此记录作为next block
                name = latestBlock
                index = latestBlock.toInt(16)
                //检查此block对应的zip归档文件是否存在
                val latestBlockFile = Path(appdata.storage.storageDir, Filename.ORIGINAL_FILE_DIR, "$latestBlock.zip").toFile()
                if(latestBlockFile.exists()) {
                    //若存在，则表示上一个block已归档，不再可用，直接迭代至下一个block
                    index = index!! + 1
                    name = index!!.toString(16)
                    size = 0L
                    count = 0
                }else{
                    //若不存在，则认为此block还是能用的，获取其size/count
                    data.db.from(FileRecords)
                        .select(sum(FileRecords.size).aliased("size"), count(FileRecords.id).aliased("count"))
                        .where { FileRecords.block eq latestBlock }
                        .first()
                        .let {
                            size = it.getLong("size")
                            count = it.getInt("count")
                        }
                }
            }else{
                //没有任何记录，则初始化为初始值
                index = 1
                name = index!!.toString(16)
                size = 0L
                count = 0
            }
        }

        fun nextBlock(nextFileSize: Long): String {
            if(index == null) {
                synchronized(this) {
                    //tips: 这个synchronized没有二次判断，因为只有这里能将index从NULL变为NOT NULL
                    initialize()
                }
            }

            val settingStorage = appdata.setting.storage
            if(count >= settingStorage.blockMaxCount || (size > 0 && size + nextFileSize > settingStorage.blockMaxSizeMB * 1024 * 1024)) {
                synchronized(this) {
                    if(count >= settingStorage.blockMaxCount || (size > 0 && size + nextFileSize > settingStorage.blockMaxSizeMB * 1024 * 1024)) {
                        //发送一个Block已进位的通知，告知FileProcessor有新的归档要处理
                        bus.emit(FileBlockArchived(name!!))

                        index = index!! + 1
                        name = index!!.toString(16)
                        size = 0L
                        count = 0
                    }
                }
            }

            return name!!
        }

        fun addSizeAndCount(block: String, fileSize: Long) {
            if(block == name) {
                synchronized(this) {
                    if(block == name) {
                        count += 1
                        size += fileSize
                        val settingStorage = appdata.setting.storage
                        if(count >= settingStorage.blockMaxCount || size >= settingStorage.blockMaxSizeMB * 1024 * 1024) {
                            //稍后再判断是否要进位到下一个block(防止undo), 以及启动归档操作
                            pool.submit {
                                Thread.sleep(1000L)
                                if(count >= settingStorage.blockMaxCount || size >= settingStorage.blockMaxSizeMB * 1024 * 1024) {
                                    synchronized(this) {
                                        if(count >= settingStorage.blockMaxCount || size >= settingStorage.blockMaxSizeMB * 1024 * 1024) {
                                            //发送一个Block已进位的通知，告知FileProcessor有新的归档要处理
                                            bus.emit(FileBlockArchived(name!!))

                                            index = index!! + 1
                                            name = index!!.toString(16)
                                            size = 0L
                                            count = 0
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        fun delSizeAndCount(block: String, fileSize: Long) {
            if(block == name) {
                synchronized(this) {
                    if(block == name) {
                        count -= 1
                        size -= fileSize
                    }
                }
            }
        }
    }

    /**
     * cache access record记录模块。
     */
    private inner class CacheRecord {
        private val lastRecords = ConcurrentHashMap<Int, FileCacheRecord>()
        @Volatile private var cacheRecords = ConcurrentHashMap<Int, LocalDateTime>()

        val isIdle get() = cacheRecords.isEmpty()

        /**
         * 添加一条对此文件的访问记录。
         */
        fun addAccessRecord(archiveType: ArchiveType, block: String, filename: String) {
            val now = DateTime.now()
            val fileId = filename.substringBeforeLast('.').toInt()
            val key = fileId shl 2 + archiveType.ordinal
            lastRecords[key].let { lastTime ->
                if(lastTime == null || now >= lastTime.lastAccessTime.plusHours(1)) {
                    cacheRecords[key] = now
                    lastRecords[key] = FileCacheRecord(fileId, archiveType, block, filename, now)
                    //使用lastRecords做总体计量。当一次访问距离上次访问超过1小时时，才允许下一次访问写入。此机制防止频繁写入
                }
            }
        }

        fun daemonThread() {
            while (true) {
                try {
                    Thread.sleep(10000)
                }catch (e: InterruptedException) {
                    return
                }

                if(cacheRecords.isNotEmpty()) {
                    val records = cacheRecords
                    cacheRecords = ConcurrentHashMap()
                    val chunks = records.keys.asSequence().mapNotNull(lastRecords::get).chunked(1000)
                    data.db.transaction {
                        for (chunk in chunks) {
                            data.db.bulkInsertOrUpdate(FileCacheRecords) {
                                for ((fileId, archiveType, block, filename, lastAccessTime) in chunk) {
                                    item {
                                        set(it.fileId, fileId)
                                        set(it.archiveType, archiveType)
                                        set(it.block, block)
                                        set(it.filename, filename)
                                        set(it.lastAccessTime, lastAccessTime)
                                    }
                                }
                                onConflict(FileCacheRecords.fileId, FileCacheRecords.archiveType) {
                                    set(it.lastAccessTime, excluded(it.lastAccessTime))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}