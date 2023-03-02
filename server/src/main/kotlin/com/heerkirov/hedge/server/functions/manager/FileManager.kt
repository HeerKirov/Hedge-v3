package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.FileRecords
import com.heerkirov.hedge.server.enums.FileStatus
import com.heerkirov.hedge.server.exceptions.IllegalFileExtensionError
import com.heerkirov.hedge.server.exceptions.StorageNotAccessibleError
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.model.FileRecord
import com.heerkirov.hedge.server.utils.*
import com.heerkirov.hedge.server.utils.DateTime.parseDateTime
import com.heerkirov.hedge.server.utils.DateTime.toDateString
import com.heerkirov.hedge.server.utils.business.generateFilepath
import com.heerkirov.hedge.server.utils.business.generateThumbnailFilepath
import org.ktorm.dsl.delete
import org.ktorm.dsl.eq
import org.ktorm.dsl.insertAndGenerateKey
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import java.io.File
import java.lang.Exception
import java.nio.file.Files
import java.nio.file.StandardCopyOption

class FileManager(private val appdata: AppDataManager, private val data: DataRepository) {
    private val extensions = arrayOf("jpeg", "jpg", "png", "gif", "mp4", "webm")

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
    fun newFile(file: File, moveFile: Boolean = false): Int {
        if(!appdata.storagePathAccessor.accessible) throw be(StorageNotAccessibleError(appdata.storagePathAccessor.storageDir))

        val now = DateTime.now()
        val folder = file.lastModified().parseDateTime().toLocalDate().toDateString()
        val extension = validateExtension(file.extension)

        val id = data.db.insertAndGenerateKey(FileRecords) {
            set(it.folder, folder)
            set(it.extension, extension)
            set(it.size, file.length())
            set(it.thumbnailSize, 0)
            set(it.resolutionWidth, 0)
            set(it.resolutionHeight, 0)
            set(it.status, FileStatus.NOT_READY)
            set(it.createTime, now)
            set(it.updateTime, now)
        } as Int

        val fileOriginalPath = "${appdata.storagePathAccessor.storageDir}/${generateFilepath(folder, id, extension)}"
        val originalFile = File(fileOriginalPath)

        val dir = originalFile.parentFile
        if(!dir.exists()) dir.mkdirs()

        if(moveFile) {
            Files.move(file.toPath(), originalFile.toPath(), StandardCopyOption.REPLACE_EXISTING)
        }else{
            try {
                file.copyTo(originalFile, overwrite = true)
            }catch (e: Exception) {
                file.deleteIfExists()
                throw e
            }
        }

        return id
    }

    /**
     * 撤销文件的新建操作。
     * - 删除文件记录。
     * - 如果文件被移动，那么移动回去；如果文件被复制，那么删除文件。
     * - 如果缩略图已完成，那么删除缩略图。
     */
    fun undoFile(importFile: File, fileId: Int, moveFile: Boolean = false) {
        if(!appdata.storagePathAccessor.accessible) throw be(StorageNotAccessibleError(appdata.storagePathAccessor.storageDir))

        val fileRecord = getFile(fileId) ?: return
        val fileOriginalPath = "${appdata.storagePathAccessor.storageDir}/${generateFilepath(fileRecord.folder, fileId, fileRecord.extension)}"
        val originalFile = File(fileOriginalPath)
        if(moveFile) {
            originalFile.renameTo(importFile)
        }else{
            originalFile.deleteIfExists()
        }

        val thumbnailFilepath = if(fileRecord.status == FileStatus.READY) { generateThumbnailFilepath(fileRecord.folder, fileRecord.id) }else null
        if(thumbnailFilepath != null) File("${appdata.storagePathAccessor.storageDir}/${thumbnailFilepath}").deleteIfExists()

        data.db.delete(FileRecords) {
            it.id eq fileId
        }
    }

    /**
     * 删除一个文件。
     * 这会确实地删除文件，一并删除数据库记录。
     */
    fun deleteFile(fileId: Int) {
        if(!appdata.storagePathAccessor.accessible) throw be(StorageNotAccessibleError(appdata.storagePathAccessor.storageDir))

        val fileRecord = getFile(fileId) ?: return
        val filepath = generateFilepath(fileRecord.folder, fileRecord.id, fileRecord.extension)
        val thumbnailFilepath = if(fileRecord.status == FileStatus.READY) { generateThumbnailFilepath(fileRecord.folder, fileRecord.id) }else null

        data.db.delete(FileRecords) {
            it.id eq fileId
        }

        File("${appdata.storagePathAccessor.storageDir}/${filepath}").deleteIfExists()
        if(thumbnailFilepath != null) File("${appdata.storagePathAccessor.storageDir}/${thumbnailFilepath}").deleteIfExists()
    }

    /**
     * 查询一个指定的物理文件记录。
     * 因为模式固定且多处使用，因此封装为一次调用。
     */
    private fun getFile(fileId: Int): FileRecord? {
        return data.db.sequenceOf(FileRecords).firstOrNull { it.id eq fileId }
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
}