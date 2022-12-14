package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.backend.similar.SimilarFinder
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.ImportOption
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.FileRecords
import com.heerkirov.hedge.server.dao.ImportImages
import com.heerkirov.hedge.server.dto.filter.ImportFilter
import com.heerkirov.hedge.server.dto.form.ImportBatchUpdateForm
import com.heerkirov.hedge.server.dto.form.ImportForm
import com.heerkirov.hedge.server.dto.form.ImportUpdateForm
import com.heerkirov.hedge.server.dto.form.UploadForm
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.FileStatus
import com.heerkirov.hedge.server.events.ImportDeleted
import com.heerkirov.hedge.server.events.ImportSaved
import com.heerkirov.hedge.server.events.ImportUpdated
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.manager.*
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.utils.DateTime.parseDateTime
import com.heerkirov.hedge.server.utils.DateTime.toMillisecond
import com.heerkirov.hedge.server.utils.business.takeAllFilepathOrNull
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.escapeLike
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.tuples.Tuple4
import com.heerkirov.hedge.server.utils.types.Opt
import com.heerkirov.hedge.server.utils.types.undefined
import org.ktorm.dsl.*
import org.ktorm.entity.*

class ImportService(private val data: DataRepository,
                    private val bus: EventBus,
                    private val fileManager: FileManager,
                    private val importManager: ImportManager,
                    private val illustManager: IllustManager,
                    private val sourceManager: SourceDataManager,
                    private val importMetaManager: ImportMetaManager,
                    private val similarFinder: SimilarFinder) {
    private val orderTranslator = OrderTranslator {
        "id" to ImportImages.id
        "fileCreateTime" to ImportImages.fileCreateTime nulls last
        "fileUpdateTime" to ImportImages.fileUpdateTime nulls last
        "fileImportTime" to ImportImages.fileImportTime
        "orderTime" to ImportImages.orderTime
    }

    fun list(filter: ImportFilter): ListResult<ImportImageRes> {
        return data.db.from(ImportImages)
            .innerJoin(FileRecords, FileRecords.id eq ImportImages.fileId)
            .select(
                ImportImages.id, ImportImages.fileName,
                ImportImages.sourceSite, ImportImages.sourceId, ImportImages.sourcePart,
                ImportImages.partitionTime, ImportImages.orderTime, ImportImages.tagme,
                FileRecords.id, FileRecords.folder, FileRecords.extension, FileRecords.status)
            .whereWithConditions {
                if(!filter.search.isNullOrBlank()) {
                    it += ImportImages.fileName escapeLike filter.search.split(" ").map(String::trim).filter(String::isNotEmpty).joinToString("%", "%", "%")
                }
            }
            .orderBy(orderTranslator, filter.order)
            .limit(filter.offset, filter.limit)
            .toListResult {
                val (file, thumbnailFile) = takeAllFilepathOrNull(it)
                ImportImageRes(
                    it[ImportImages.id]!!, file, thumbnailFile, it[ImportImages.fileName],
                    it[ImportImages.sourceSite], it[ImportImages.sourceId], it[ImportImages.sourcePart],
                    it[ImportImages.tagme]!!,
                    it[ImportImages.partitionTime]!!, it[ImportImages.orderTime]!!.parseDateTime())
            }
    }

    /**
     * @throws IllegalFileExtensionError (extension) ??????????????????????????????
     * @throws FileNotFoundError ??????????????????
     * @throws StorageNotAccessibleError ????????????????????????
     */
    fun import(form: ImportForm): Pair<Int, List<BaseException<*>>> {
        return importManager.import(form.filepath, form.mobileImport)
    }

    /**
     * @throws IllegalFileExtensionError (extension) ??????????????????????????????
     * @throws StorageNotAccessibleError ????????????????????????
     */
    fun upload(form: UploadForm): Pair<Int, List<BaseException<*>>> {
        return importManager.upload(form.content, form.filename, form.extension)
    }

    /**
     * @throws NotFound ?????????????????????
     */
    fun get(id: Int): ImportImageDetailRes {
        val row = data.db.from(ImportImages)
            .innerJoin(FileRecords, FileRecords.id eq ImportImages.fileId)
            .select()
            .where { ImportImages.id eq id }
            .firstOrNull() ?: throw be(NotFound())

        val (file, thumbnailFile) = takeAllFilepathOrNull(row)

        return ImportImageDetailRes(
            row[ImportImages.id]!!,
            file, thumbnailFile,
            row[ImportImages.fileName], row[ImportImages.filePath],
            row[ImportImages.fileCreateTime], row[ImportImages.fileUpdateTime], row[ImportImages.fileImportTime]!!,
            row[ImportImages.tagme]!!, row[ImportImages.sourceSite], row[ImportImages.sourceId], row[ImportImages.sourcePart],
            row[ImportImages.partitionTime]!!, row[ImportImages.orderTime]!!.parseDateTime(), row[ImportImages.createTime]!!
        )
    }

    /**
     * @throws NotFound ?????????????????????
     * @throws ResourceNotExist ("site", string) ?????????site?????????
     */
    fun update(id: Int, form: ImportUpdateForm) {
        data.db.transaction {
            val record = data.db.sequenceOf(ImportImages).firstOrNull { it.id eq id } ?: throw be(NotFound())

            //source????????????
            val (newSource, newSourceId, newSourcePart) = if(form.source.isPresent) {
                val source = form.source.value
                if(source == null) {
                    if(form.sourceId.unwrapOr { null } != null || form.sourcePart.unwrapOr { null } != null) throw be(ParamNotRequired("sourceId/sourcePart"))
                    else Triple(Opt(null), Opt(null), Opt(null))
                }else{
                    sourceManager.checkSourceSite(source, form.sourceId.unwrapOr { record.sourceId }, form.sourcePart.unwrapOr { record.sourcePart })
                    Triple(form.source, form.sourceId, form.sourcePart)
                }
            }else if(form.sourceId.unwrapOr { null } != null || form.sourcePart.unwrapOr { null } != null) {
                if(record.sourceSite == null) throw be(ParamNotRequired("sourceId/sourcePart"))
                else{
                    sourceManager.checkSourceSite(record.sourceSite, form.sourceId.unwrapOr { record.sourceId }, form.sourcePart.unwrapOr { record.sourcePart })
                    Triple(undefined(), form.sourceId, form.sourcePart)
                }
            }else Triple(undefined(), undefined(), undefined())

            if (form.tagme.isPresent || form.source.isPresent || form.sourceId.isPresent || form.sourcePart.isPresent ||
                form.partitionTime.isPresent || form.orderTime.isPresent || form.createTime.isPresent) {
                data.db.update(ImportImages) {
                    where { it.id eq id }
                    form.tagme.applyOpt { set(it.tagme, this) }
                    newSource.applyOpt { set(it.sourceSite, this) }
                    newSourceId.applyOpt { set(it.sourceId, this) }
                    newSourcePart.applyOpt { set(it.sourcePart, this) }
                    form.partitionTime.applyOpt { set(it.partitionTime, this) }
                    form.orderTime.applyOpt { set(it.orderTime, this.toMillisecond()) }
                    form.createTime.applyOpt { set(it.createTime, this) }
                }

                bus.emit(ImportUpdated(id, generalUpdated = true, thumbnailFileReady = false))
            }
        }
    }

    /**
     * @throws NotFound ?????????????????????
     */
    fun delete(id: Int) {
        data.db.transaction {
            val row = data.db.from(ImportImages).select(ImportImages.fileId).where { ImportImages.id eq id }.firstOrNull() ?: throw be(NotFound())
            data.db.delete(ImportImages) { it.id eq id }
            fileManager.deleteFile(row[ImportImages.fileId]!!)

            bus.emit(ImportDeleted(id))
        }
    }

    /**
     * @throws ResourceNotExist ("target", number[]) ??????????????????????????????????????????????????????source image id??????
     * @warn InvalidRegexError (regex) ?????????????????????????????????????????????????????????????????????????????????
     */
    fun batchUpdate(form: ImportBatchUpdateForm): Map<Int, List<BaseException<*>>> {
        data.db.transaction {
            if(form.tagme != null || form.partitionTime != null || form.setCreateTimeBy != null || form.setOrderTimeBy != null || form.analyseSource) {
                val records = if(form.target.isNullOrEmpty()) {
                    data.db.sequenceOf(ImportImages).toList()
                }else{
                    data.db.sequenceOf(ImportImages).filter { ImportImages.id inList form.target }.toList().also { records ->
                        if(records.size < form.target.size) {
                            throw be(ResourceNotExist("target", form.target.toSet() - records.map { it.id }.toSet()))
                        }
                    }
                }

                val sourceResultMap = mutableMapOf<Int, Tuple4<String, Long?, Int?, Illust.Tagme?>>()
                val errors = mutableMapOf<Int, List<BaseException<*>>>()
                if(form.analyseSource) {
                    val autoSetTagmeOfSource = data.setting.import.setTagmeOfSource

                    for (record in records) {
                        val (source, sourceId, sourcePart) = try {
                            importMetaManager.analyseSourceMeta(record.fileName)
                        } catch (e: BusinessException) {
                            errors[record.id] = listOf(e.exception)
                            continue
                        }
                        if (source != null) {
                            val tagme = if (autoSetTagmeOfSource && Illust.Tagme.SOURCE in record.tagme) record.tagme - Illust.Tagme.SOURCE else null
                            sourceResultMap[record.id] = Tuple4(source, sourceId, sourcePart, tagme)
                        }
                    }
                }

                data.db.batchUpdate(ImportImages) {
                    for (record in records) {
                        item {
                            where { it.id eq record.id }
                            sourceResultMap[record.id]?.let { (sourceSite, sourceId, sourcePart, tagme) ->
                                set(it.sourceSite, sourceSite)
                                set(it.sourceId, sourceId)
                                set(it.sourcePart, sourcePart)
                                if(tagme != null && form.tagme == null) set(it.tagme, tagme)
                            }
                            if(form.tagme != null) set(it.tagme, form.tagme)
                            if(form.partitionTime != null) set(it.partitionTime, form.partitionTime)
                            if(form.setCreateTimeBy != null) set(it.createTime, when(form.setCreateTimeBy) {
                                ImportOption.TimeType.CREATE_TIME -> record.fileCreateTime ?: record.fileImportTime
                                ImportOption.TimeType.UPDATE_TIME -> record.fileUpdateTime ?: record.fileImportTime
                                ImportOption.TimeType.IMPORT_TIME -> record.fileImportTime
                            })
                            if(form.setOrderTimeBy != null) set(it.orderTime, when(form.setOrderTimeBy) {
                                ImportOption.TimeType.CREATE_TIME -> record.fileCreateTime ?: record.fileImportTime
                                ImportOption.TimeType.UPDATE_TIME -> record.fileUpdateTime ?: record.fileImportTime
                                ImportOption.TimeType.IMPORT_TIME -> record.fileImportTime
                            }.toMillisecond())
                        }
                    }
                }
                return errors
            }
        }

        return emptyMap()
    }

    /**
     * ?????????
     * @throws NotReadyFileError ??????????????????????????????????????????????????????????????????????????????
     */
    fun save(): ImportSaveRes {
        data.db.transaction {
            val records = data.db.from(ImportImages)
                .innerJoin(FileRecords, ImportImages.fileId eq FileRecords.id)
                .select()
                .map { Pair(ImportImages.createEntity(it), FileRecords.createEntity(it)) }

            if(records.any { (_, file) -> file.status == FileStatus.NOT_READY }) throw be(NotReadyFileError())

            val imageIds = records.map { (record, _) ->
                illustManager.newImage(
                    fileId = record.fileId,
                    tagme = record.tagme,
                    sourceSite = record.sourceSite,
                    sourceId = record.sourceId,
                    sourcePart = record.sourcePart,
                    partitionTime = record.partitionTime,
                    orderTime = record.orderTime,
                    createTime = record.createTime)
                // ??????{newImage}?????????????????????????????????????????????????????????
                // source????????????????????????????????????????????????????????????????????????????????????????????????site???
                // ????????????????????????bug???????????????unknown error???????????????
            }

            data.db.deleteAll(ImportImages)

            if(data.setting.findSimilar.autoFindSimilar) {
                similarFinder.add(FindSimilarTask.TaskSelectorOfImage(imageIds), data.setting.findSimilar.autoTaskConf ?: data.setting.findSimilar.defaultTaskConf)
            }

            bus.emit(ImportSaved())

            return ImportSaveRes(records.size)
        }
    }
}
