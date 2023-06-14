package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.backend.FileGenerator
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.ImportOption
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.ImportImages
import com.heerkirov.hedge.server.dto.form.ImportUpdateForm
import com.heerkirov.hedge.server.events.ImportCreated
import com.heerkirov.hedge.server.events.ImportDeleted
import com.heerkirov.hedge.server.events.ImportUpdated
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.model.ImportImage
import com.heerkirov.hedge.server.utils.DateTime
import com.heerkirov.hedge.server.utils.DateTime.asZonedTime
import com.heerkirov.hedge.server.utils.DateTime.parseDateTime
import com.heerkirov.hedge.server.utils.DateTime.toMillisecond
import com.heerkirov.hedge.server.utils.Fs
import com.heerkirov.hedge.server.utils.deleteIfExists
import com.heerkirov.hedge.server.utils.runIf
import com.heerkirov.hedge.server.utils.tools.defer
import com.heerkirov.hedge.server.utils.types.Opt
import com.heerkirov.hedge.server.utils.types.optOf
import com.heerkirov.hedge.server.utils.types.undefined
import org.ktorm.dsl.delete
import org.ktorm.dsl.eq
import org.ktorm.dsl.insertAndGenerateKey
import org.ktorm.dsl.update
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import java.io.File
import java.io.InputStream
import java.lang.Exception
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.nio.file.attribute.BasicFileAttributes
import java.time.LocalDateTime

class ImportManager(private val data: DataRepository,
                    private val bus: EventBus,
                    private val sourceManager: SourceDataManager,
                    private val importMetaManager: ImportMetaManager,
                    private val fileManager: FileManager,
                    private val fileGenerator: FileGenerator) {
    /**
     * @throws IllegalFileExtensionError (extension) 此文件扩展名不受支持
     * @throws FileNotFoundError 此文件不存在
     * @throws StorageNotAccessibleError 存储路径不可访问
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
     * @throws StorageNotAccessibleError 存储路径不可访问
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
     * 修改内容。
     * @throws NotFound
     */
    fun update(id: Int, form: ImportUpdateForm) {
        val record = data.db.sequenceOf(ImportImages).firstOrNull { it.id eq id } ?: throw be(NotFound())

        //source更新检查
        val (newSource, newSourceId, newSourcePart) = if(form.sourceSite.isPresent) {
            val source = form.sourceSite.value
            if(source == null) {
                if(form.sourceId.unwrapOr { null } != null || form.sourcePart.unwrapOr { null } != null) throw be(ParamNotRequired("sourceId/sourcePart"))
                else Triple(Opt(null), Opt(null), Opt(null))
            }else{
                sourceManager.checkSourceSite(source, form.sourceId.unwrapOr { record.sourceId }, form.sourcePart.unwrapOr { record.sourcePart })
                Triple(form.sourceSite, form.sourceId, form.sourcePart)
            }
        }else if(form.sourceId.unwrapOr { null } != null || form.sourcePart.unwrapOr { null } != null) {
            if(record.sourceSite == null) throw be(ParamNotRequired("sourceId/sourcePart"))
            else{
                sourceManager.checkSourceSite(record.sourceSite, form.sourceId.unwrapOr { record.sourceId }, form.sourcePart.unwrapOr { record.sourcePart })
                Triple(undefined(), form.sourceId, form.sourcePart)
            }
        }else Triple(undefined(), undefined(), undefined())

        val newCollectionId = form.collectionId.letOpt {
            when (form.collectionId.value) {
                null -> null
                is String -> "@${(form.collectionId.value as String)}"
                is Int -> "#${(form.collectionId.value as Int)}"
                else -> throw be(ParamTypeError("collectionId", "must be number or string."))
            }
        }

        val newBookIds = if(form.bookIds.isPresent) {
            form.bookIds
        }else if(form.appendBookIds.isPresent) {
            optOf(((record.bookIds ?: emptyList()) + form.appendBookIds.value).distinct())
        }else{
            undefined()
        }

        val newFolderIds = if(form.folderIds.isPresent) {
            form.folderIds
        }else if(form.appendFolderIds.isPresent) {
            optOf(((record.folderIds ?: emptyList()) + form.appendFolderIds.value).distinct())
        }else{
            undefined()
        }

        if (form.tagme.isPresent || form.sourceSite.isPresent || form.sourceId.isPresent || form.sourcePart.isPresent ||
            form.partitionTime.isPresent || form.orderTime.isPresent || form.createTime.isPresent ||
            form.preference.isPresent || form.collectionId.isPresent || newBookIds.isPresent || newFolderIds.isPresent) {
            data.db.update(ImportImages) {
                where { it.id eq id }
                newSource.applyOpt { set(it.sourceSite, this) }
                newSourceId.applyOpt { set(it.sourceId, this) }
                newSourcePart.applyOpt { set(it.sourcePart, this) }
                form.tagme.applyOpt { set(it.tagme, this) }
                form.partitionTime.applyOpt { set(it.partitionTime, this) }
                form.orderTime.applyOpt { set(it.orderTime, this.toMillisecond()) }
                form.createTime.applyOpt { set(it.createTime, this) }
                form.preference.applyOpt { set(it.preference, this) }
                newFolderIds.applyOpt { set(it.folderIds, this) }
                newBookIds.applyOpt { set(it.bookIds, this) }
                newCollectionId.applyOpt { set(it.collectionId, this) }
            }

            bus.emit(ImportUpdated(id, generalUpdated = true, thumbnailFileReady = false))
        }
    }

    /**
     * 删除一条记录。
     */
    fun delete(importImage: ImportImage) {
        data.db.delete(ImportImages) { it.id eq importImage.id }
        fileManager.deleteFile(importImage.fileId)

        bus.emit(ImportDeleted(importImage.id))
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
            set(it.collectionId, null)
            set(it.folderIds, null)
            set(it.bookIds, null)
            set(it.preference, null)
            set(it.tagme, tagme)
            set(it.sourceSite, sourceSite)
            set(it.sourceId, sourceId)
            set(it.sourcePart, sourcePart)
            set(it.partitionTime, partitionTime)
            set(it.orderTime, orderTime.toMillisecond())
            set(it.createTime, fileImportTime)
        } as Int

        bus.emit(ImportCreated(id))

        return Pair(id, warnings)
    }
}