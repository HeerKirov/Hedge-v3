package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.backend.FileGenerator
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.ImportOption
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.ImportImages
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.utils.DateTime
import com.heerkirov.hedge.server.utils.DateTime.asZonedTime
import com.heerkirov.hedge.server.utils.DateTime.parseDateTime
import com.heerkirov.hedge.server.utils.DateTime.toMillisecond
import com.heerkirov.hedge.server.utils.Fs
import com.heerkirov.hedge.server.utils.deleteIfExists
import com.heerkirov.hedge.server.utils.runIf
import com.heerkirov.hedge.server.utils.tools.defer
import org.ktorm.dsl.insertAndGenerateKey
import java.io.File
import java.io.InputStream
import java.lang.Exception
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.nio.file.attribute.BasicFileAttributes
import java.time.LocalDateTime

class ImportManager(private val data: DataRepository, private val importMetaManager: ImportMetaManager, private val fileManager: FileManager, private val fileGenerator: FileGenerator) {
    /**
     * @throws IllegalFileExtensionError (extension) 此文件扩展名不受支持
     * @throws FileNotFoundError 此文件不存在
     */
    fun import(filepath: String, mobileImport: Boolean): Pair<Int, List<BaseException<*>>> = defer {
        val file = File(filepath)
        if(!file.exists() || !file.canRead()) throw be(FileNotFoundError())

        val attr = Files.readAttributes(file.toPath(), BasicFileAttributes::class.java)
        val fileCreateTime = attr?.creationTime()?.toMillis()?.parseDateTime()
        val fileUpdateTime = file.lastModified().parseDateTime()
        val fileName = file.name
        val filePath = file.absoluteFile.parent

        val fileId = data.db.transaction { fileManager.newFile(file, mobileImport) }.alsoExcept { fileId ->
            fileManager.deleteFile(fileId)
        }.alsoReturns {
            fileGenerator.appendTask(it)
        }

        try {
            data.db.transaction {
                newImportRecord(fileId, sourceFilename = fileName, sourceFilepath = filePath, fileCreateTime, fileUpdateTime)
            }
        }catch (e: Exception) {
            fileManager.undoFile(file, fileId, mobileImport)
            throw e
        }
    }

    /**
     * @throws IllegalFileExtensionError (extension) 此文件扩展名不受支持
     */
    fun upload(content: InputStream, filename: String, extension: String): Pair<Int, List<BaseException<*>>> = defer {
        val file = Fs.temp(extension).applyDefer {
            deleteIfExists()
        }.also { file ->
            Files.copy(content, file.toPath(), StandardCopyOption.REPLACE_EXISTING)
        }

        val fileId = data.db.transaction { fileManager.newFile(file) }.alsoExcept { fileId ->
            fileManager.deleteFile(fileId)
        }.alsoReturns {
            fileGenerator.appendTask(it)
        }

        data.db.transaction {
            newImportRecord(fileId, sourceFilename = filename)
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
                                fileCreateTime: LocalDateTime? = null,
                                fileUpdateTime: LocalDateTime? = null): Pair<Int, List<BaseException<*>>> {
        val options = data.setting.import

        val fileImportTime = DateTime.now()

        val orderTime = when(options.setOrderTimeBy) {
            ImportOption.TimeType.CREATE_TIME -> fileCreateTime ?: fileImportTime
            ImportOption.TimeType.UPDATE_TIME -> fileUpdateTime ?: fileImportTime
            ImportOption.TimeType.IMPORT_TIME -> fileImportTime
        }

        val partitionTime = orderTime
            .runIf(options.setPartitionTimeDelay != null && options.setPartitionTimeDelay!!!= 0L) { (this.toMillisecond() - options.setPartitionTimeDelay!!).parseDateTime() }
            .asZonedTime().toLocalDate()

        val warnings = mutableListOf<BaseException<*>>()

        val (sourceSite, sourceId, sourcePart) = if(options.autoAnalyseSourceData) {
            try {
                importMetaManager.analyseSourceMeta(sourceFilename)
            }catch (e: BusinessException) {
                warnings.add(e.exception)
                Triple(null, null, null)
            }
        }else Triple(null, null, null)

        val tagme = Illust.Tagme.EMPTY.runIf<Illust.Tagme>(options.setTagmeOfTag) {
            this + Illust.Tagme.TAG + Illust.Tagme.AUTHOR + Illust.Tagme.TOPIC
        }.runIf(sourceSite == null && options.setTagmeOfSource) {
            this + Illust.Tagme.SOURCE
        }

        val id = data.db.insertAndGenerateKey(ImportImages) {
            set(it.fileId, fileId)
            set(it.fileName, sourceFilename)
            set(it.filePath, sourceFilepath)
            set(it.fileCreateTime, fileCreateTime)
            set(it.fileUpdateTime, fileUpdateTime)
            set(it.fileImportTime, fileImportTime)
            set(it.tagme, tagme)
            set(it.sourceSite, sourceSite)
            set(it.sourceId, sourceId)
            set(it.sourcePart, sourcePart)
            set(it.partitionTime, partitionTime)
            set(it.orderTime, orderTime.toMillisecond())
            set(it.createTime, fileImportTime)
        } as Int

        return Pair(id, warnings)
    }
}