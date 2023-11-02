package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.ImportRecords
import com.heerkirov.hedge.server.enums.ImportStatus
import com.heerkirov.hedge.server.events.FileCreated
import com.heerkirov.hedge.server.events.ImportCreated
import com.heerkirov.hedge.server.events.ImportDeleted
import com.heerkirov.hedge.server.exceptions.FileNotFoundError
import com.heerkirov.hedge.server.exceptions.IllegalFileExtensionError
import com.heerkirov.hedge.server.exceptions.StorageNotAccessibleError
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.utils.DateTime.toInstant
import com.heerkirov.hedge.server.utils.Fs
import com.heerkirov.hedge.server.utils.deleteIfExists
import com.heerkirov.hedge.server.utils.tools.defer
import org.ktorm.dsl.*
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import java.io.File
import java.io.InputStream
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.nio.file.attribute.BasicFileAttributes
import java.time.Instant

class ImportManager(private val data: DataRepository,
                    private val bus: EventBus,
                    private val fileManager: FileManager) {
    /**
     * @throws IllegalFileExtensionError (extension) 此文件扩展名不受支持
     * @throws FileNotFoundError 此文件不存在
     * @throws StorageNotAccessibleError 存储路径不可访问
     */
    fun import(filepath: String, mobileImport: Boolean): Int = defer {
        val file = File(filepath)
        if(!file.exists() || !file.canRead()) throw be(FileNotFoundError())

        val attr = Files.readAttributes(file.toPath(), BasicFileAttributes::class.java)
        val fileCreateTime = attr?.creationTime()?.toMillis()?.toInstant()
        val fileUpdateTime = file.lastModified().toInstant()
        val fileName = file.name
        val filePath = file.absoluteFile.parent

        val fileId = data.db.transaction {
            fileManager.newFile(file, fileName, mobileImport)
        }.alsoExcept {
            fileManager.undoFile(file, it, mobileImport)
        }.alsoReturns {
            bus.emit(FileCreated(it))
        }

        data.db.transaction {
            newImportRecord(fileId, sourceFilename = fileName, sourceFilepath = filePath, fileCreateTime, fileUpdateTime)
        }
    }

    /**
     * @throws IllegalFileExtensionError (extension) 此文件扩展名不受支持
     * @throws StorageNotAccessibleError 存储路径不可访问
     */
    fun upload(content: InputStream, filename: String, extension: String): Int = defer {
        val file = Fs.temp(extension).applyDefer {
            deleteIfExists()
        }.also { file ->
            Files.copy(content, file.toPath(), StandardCopyOption.REPLACE_EXISTING)
        }

        val fileId = data.db.transaction {
            fileManager.newFile(file, filename)
        }.alsoExcept { fileId ->
            fileManager.undoFile(file, fileId)
        }.alsoReturns {
            bus.emit(FileCreated(it))
        }

        data.db.transaction {
            newImportRecord(fileId, sourceFilename = filename)
        }
    }

    /**
     * 删除一条记录。这会将现存记录标记为deleted，但不会将其彻底删除。
     */
    fun deleteByImageId(imageId: Int) {
        val record = data.db.sequenceOf(ImportRecords).firstOrNull { it.imageId eq imageId }
        if(record != null && !record.deleted) {
            data.db.update(ImportRecords) {
                where { it.id eq record.id }
                set(it.deleted, true)
                set(it.deletedTime, Instant.now())
            }
            //不会删除file，因为此调用永远从image发起，而image联系的importRecord必定是completed状态
            bus.emit(ImportDeleted(record.id))
        }
    }

    /**
     * 创建一条新的import记录。
     * 在此方法中进行source analyse时，分析过程抛出的异常会被捕获，并以警告的形式返回。
     * @return (import image id, warnings)
     */
    private fun newImportRecord(fileId: Int,
                                sourceFilename: String? = null,
                                sourceFilepath: String? = null,
                                fileCreateTime: Instant? = null,
                                fileUpdateTime: Instant? = null): Int {
        val id = data.db.insertAndGenerateKey(ImportRecords) {
            set(it.fileId, fileId)
            set(it.imageId, null)
            set(it.status, ImportStatus.PROCESSING)
            set(it.statusInfo, null)
            set(it.deleted, false)
            set(it.fileName, sourceFilename)
            set(it.filePath, sourceFilepath)
            set(it.fileCreateTime, fileCreateTime)
            set(it.fileUpdateTime, fileUpdateTime)
            set(it.importTime, Instant.now())
            set(it.deletedTime, null)
        } as Int

        bus.emit(ImportCreated(id))

        return id
    }
}