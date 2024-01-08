package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.appdata.ImportOption
import com.heerkirov.hedge.server.components.backend.watcher.PathWatcher
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.filter.ImportFilter
import com.heerkirov.hedge.server.dto.form.*
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.ImportStatus
import com.heerkirov.hedge.server.enums.TagAddressType
import com.heerkirov.hedge.server.events.FileCreated
import com.heerkirov.hedge.server.events.ImportDeleted
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.manager.*
import com.heerkirov.hedge.server.model.ImportRecord
import com.heerkirov.hedge.server.utils.DateTime.toInstant
import com.heerkirov.hedge.server.utils.business.filePathOrNullFrom
import com.heerkirov.hedge.server.utils.business.sourcePathOf
import com.heerkirov.hedge.server.utils.business.toListResult
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.escapeLike
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.types.optOf
import org.ktorm.dsl.*
import java.time.Instant

class ImportService(private val appdata: AppDataManager,
                    private val data: DataRepository,
                    private val bus: EventBus,
                    private val fileManager: FileManager,
                    private val illustManager: IllustManager,
                    private val importManager: ImportManager,
                    private val sourceAnalyzeManager: SourceAnalyzeManager,
                    private val sourceDataManager: SourceDataManager,
                    private val pathWatcher: PathWatcher) {
    private val orderTranslator = OrderTranslator {
        "id" to ImportRecords.id
        "status" to ImportRecords.status
        "fileCreateTime" to ImportRecords.fileCreateTime nulls last
        "fileUpdateTime" to ImportRecords.fileUpdateTime nulls last
        "importTime" to ImportRecords.importTime
    }

    fun list(filter: ImportFilter): ListResult<ImportImageRes> {
        return data.db.from(ImportRecords)
            .leftJoin(FileRecords, FileRecords.id eq ImportRecords.fileId)
            .leftJoin(Illusts, ImportRecords.imageId.isNotNull() and (Illusts.id eq ImportRecords.imageId))
            .select(
                ImportRecords.id, ImportRecords.fileName, ImportRecords.status, ImportRecords.importTime,
                Illusts.id, Illusts.exportedScore, Illusts.favorite, Illusts.tagme, Illusts.orderTime, Illusts.partitionTime,
                Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, Illusts.sourcePartName,
                FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .whereWithConditions {
                it += ImportRecords.deleted eq filter.deleted
                if(filter.status != null) {
                    it += ImportRecords.status eq filter.status
                }
                if(!filter.search.isNullOrBlank()) {
                    it += ImportRecords.fileName escapeLike filter.search.split(" ").map(String::trim).filter(String::isNotEmpty).joinToString("%", "%", "%")
                }
            }
            .orderBy(orderTranslator, filter.order)
            .limit(filter.offset, filter.limit)
            .toListResult {
                //由于deleted record的file可能已被删除，因此filePath可能是null
                val filePath = it[FileRecords.id]?.run { filePathOrNullFrom(it) }
                val illust = it[Illusts.id]?.let { id ->
                    val score = it[Illusts.exportedScore]
                    val favorite = it[Illusts.favorite]!!
                    val tagme = it[Illusts.tagme]!!
                    val partitionTime = it[Illusts.partitionTime]!!
                    val orderTime = Instant.ofEpochMilli(it[Illusts.orderTime]!!)
                    val source = sourcePathOf(it[Illusts.sourceSite], it[Illusts.sourceId], it[Illusts.sourcePart], it[Illusts.sourcePartName])
                    ImportImageRes.ImportIllust(id, score, favorite, tagme, source, partitionTime, orderTime)
                }
                ImportImageRes(it[ImportRecords.id]!!, it[ImportRecords.status]!!, filePath, illust, it[ImportRecords.fileName], it[ImportRecords.importTime]!!)
            }
    }

    /**
     * @throws IllegalFileExtensionError (extension) 此文件扩展名不受支持
     * @throws FileNotFoundError 此文件不存在
     * @throws StorageNotAccessibleError 存储路径不可访问
     */
    fun import(form: ImportForm): Int {
        return importManager.import(form.filepath, form.mobileImport)
    }

    /**
     * @throws IllegalFileExtensionError (extension) 此文件扩展名不受支持
     * @throws StorageNotAccessibleError 存储路径不可访问
     */
    fun upload(form: UploadForm): Int {
        return importManager.upload(form.content, form.filename, form.extension)
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun get(id: Int): ImportImageDetailRes {
        val row = data.db.from(ImportRecords)
            .leftJoin(FileRecords, FileRecords.id eq ImportRecords.fileId)
            .leftJoin(Illusts, ImportRecords.imageId.isNotNull() and (ImportRecords.imageId eq Illusts.id))
            .select()
            .where { ImportRecords.id eq id }
            .firstOrNull() ?: throw be(NotFound())

        //由于deleted record的file可能已被删除，因此filePath可能是null
        val filePath = row[FileRecords.id]?.run { filePathOrNullFrom(row) }

        val illust = row[Illusts.id]?.let { illustId ->
            val extension = row[FileRecords.extension]!!
            val size = row[FileRecords.size]!!
            val resolutionWidth = row[FileRecords.resolutionWidth]!!
            val resolutionHeight = row[FileRecords.resolutionHeight]!!
            val videoDuration = row[FileRecords.videoDuration]!!

            val description = row[Illusts.exportedDescription]!!
            val score = row[Illusts.exportedScore]
            val favorite = row[Illusts.favorite]!!
            val tagme = row[Illusts.tagme]!!
            val partitionTime = row[Illusts.partitionTime]!!
            val orderTime = row[Illusts.orderTime]!!.toInstant()
            val source = sourcePathOf(row)

            val authorColors = appdata.setting.meta.authorColors
            val topicColors = appdata.setting.meta.topicColors

            val topics = data.db.from(Topics)
                .innerJoin(IllustTopicRelations, IllustTopicRelations.topicId eq Topics.id)
                .select(Topics.id, Topics.name, Topics.type, IllustTopicRelations.isExported)
                .where { IllustTopicRelations.illustId eq illustId }
                .orderBy(Topics.type.asc(), Topics.id.asc())
                .map {
                    val topicType = it[Topics.type]!!
                    val color = topicColors[topicType]
                    TopicSimpleRes(it[Topics.id]!!, it[Topics.name]!!, topicType, it[IllustTopicRelations.isExported]!!, color)
                }

            val authors = data.db.from(Authors)
                .innerJoin(IllustAuthorRelations, IllustAuthorRelations.authorId eq Authors.id)
                .select(Authors.id, Authors.name, Authors.type, IllustAuthorRelations.isExported)
                .where { IllustAuthorRelations.illustId eq illustId }
                .orderBy(Authors.type.asc(), Authors.id.asc())
                .map {
                    val authorType = it[Authors.type]!!
                    val color = authorColors[authorType]
                    AuthorSimpleRes(it[Authors.id]!!, it[Authors.name]!!, authorType, it[IllustAuthorRelations.isExported]!!, color)
                }

            val tags = data.db.from(Tags)
                .innerJoin(IllustTagRelations, IllustTagRelations.tagId eq Tags.id)
                .select(Tags.id, Tags.name, Tags.color, IllustTagRelations.isExported)
                .where { (IllustTagRelations.illustId eq illustId) and (Tags.type eq TagAddressType.TAG) }
                .orderBy(Tags.globalOrdinal.asc())
                .map { TagSimpleRes(it[Tags.id]!!, it[Tags.name]!!, it[Tags.color], it[IllustTagRelations.isExported]!!) }

            ImportImageDetailRes.ImportIllust(
                illustId,
                extension, size, resolutionWidth, resolutionHeight, videoDuration,
                topics, authors, tags,
                description, score, favorite, tagme, source,
                partitionTime, orderTime)
        }

        return ImportImageDetailRes(
            row[ImportRecords.id]!!, row[ImportRecords.status]!!, row[ImportRecords.statusInfo], filePath, illust,
            row[ImportRecords.fileName], row[ImportRecords.fileCreateTime], row[ImportRecords.fileUpdateTime],
            row[ImportRecords.importTime]!!)
    }

    /**
     * @throws ResourceNotExist ("target", number[]) 要进行解析的对象不存在。给出不存在的source image id列表
     */
    fun batch(form: ImportBatchForm) {
        //在清理record时，就已经删除file了，也就是说它是不可恢复的
        data.db.transaction {
            val records = if(form.target != null) {
                data.db.from(ImportRecords).select()
                    .where { ImportRecords.id inList form.target }
                    .map { ImportRecords.createEntity(it) }
                    .also { records ->
                        if(records.size < form.target.size) throw be(ResourceNotExist("target", form.target - records.map { it.id }.toSet()))
                    }
            }else{
                data.db.from(ImportRecords).select().map { ImportRecords.createEntity(it) }
            }

            if(form.deleteDeleted) {
                data.db.delete(ImportRecords) { if(form.target != null) { it.deleted and (it.id inList form.target) }else{ it.deleted } }

                bus.emit(records.filter { it.deleted }.map { ImportDeleted(it.id) })
            }

            if(form.delete) {
                val now = Instant.now()
                data.db.update(ImportRecords) {
                    where { if(form.target != null) { it.id inList form.target and it.deleted.not() }else{ it.deleted.not() } }
                    set(it.deleted, true)
                    set(it.deletedTime, now)
                }

                for (record in records) {
                    if(!record.deleted && record.status != ImportStatus.COMPLETED) {
                        fileManager.deleteFile(record.fileId)
                    }
                }

                bus.emit(records.filter { !it.deleted }.map { ImportDeleted(it.id) })
            }

            if(form.clearCompleted) {
                val now = Instant.now()
                data.db.update(ImportRecords) {
                    where { if(form.target != null) { it.id inList form.target and it.deleted.not() }else{ it.deleted.not() } and (it.status eq ImportStatus.COMPLETED) }
                    set(it.deleted, true)
                    set(it.deletedTime, now)
                }

                bus.emit(records.filter { !it.deleted && it.status == ImportStatus.COMPLETED }.map { ImportDeleted(it.id) })
            }

            if(form.retry) {
                //重试操作仅对PROCESSING/ERROR状态的项有效
                val filteredRecords = records.filter { it.status != ImportStatus.COMPLETED && !it.deleted }
                val statusInfo = if(!form.retryAndAllowNoSource && form.retryWithManualSource == null) null else {
                    ImportRecord.StatusInfo(retryAndAllowNoSource = form.retryAndAllowNoSource, retryWithManualSource = form.retryWithManualSource)
                }
                data.db.update(ImportRecords) {
                    where { it.id inList filteredRecords.map(ImportRecord::id) }
                    set(it.status, ImportStatus.PROCESSING)
                    if(statusInfo != null) set(it.statusInfo, statusInfo)
                }

                //该操作的实现方式是发送FileCreated事件，该事件会触发FileGenerator的执行过程
                bus.emit(filteredRecords.map { FileCreated(it.fileId) })
            }

            if(form.analyseSource) {
                //对COMPLETED状态的项重新分析其来源。
                val filteredRecords = records.filter { it.status == ImportStatus.COMPLETED && it.imageId != null }
                val errors = mutableMapOf<Int, ImportRecord.StatusInfo>()
                val sourceForms = mutableListOf<Pair<SourceDataIdentity, SourceDataUpdateForm>>()
                for (record in filteredRecords) {
                    val source = try {
                        sourceAnalyzeManager.analyseSourceMeta(record.fileName)
                    }catch (e: BusinessException) {
                        errors.compute(record.id) { _, info ->
                            ImportRecord.StatusInfo(
                                thumbnailError = info?.thumbnailError,
                                fingerprintError = info?.fingerprintError,
                                sourceAnalyseError = true,
                                sourceAnalyseNone = info?.sourceAnalyseNone,
                                messages = if(e.message == null) info?.messages else if(info?.messages != null) info.messages + listOf(e.message!!) else listOf(e.message!!)
                            )
                        }
                        continue
                    } ?: if(appdata.setting.import.preventNoneSourceData) {
                        errors.compute(record.id) { _, info ->
                            ImportRecord.StatusInfo(
                                thumbnailError = info?.thumbnailError,
                                fingerprintError = info?.fingerprintError,
                                sourceAnalyseError = info?.sourceAnalyseError,
                                sourceAnalyseNone = true,
                                messages = info?.messages
                            )
                        }
                        continue
                    }else{
                        continue
                    }

                    illustManager.updateSourceDataOfImage(record.imageId!!, source.first)
                    if(source.second != null) sourceForms.add(SourceDataIdentity(source.first.sourceSite, source.first.sourceId) to source.second!!)
                }
                for ((sourceIdentity, updateForm) in sourceForms) {
                    sourceDataManager.createOrUpdateSourceData(sourceIdentity.sourceSite, sourceIdentity.sourceId,
                        title = updateForm.title, description = updateForm.description, tags = updateForm.tags,
                        books = updateForm.books, relations = updateForm.relations, links = updateForm.links,
                        additionalInfo = updateForm.additionalInfo.letOpt { it.associateBy({ f -> f.field }) { f -> f.value } },
                        status = updateForm.status, allowUpdate = true, appendUpdate = true)
                }
            }

            if(form.analyseTime) {
                //对COMPLETED状态的项重新生成其时间。
                val filteredRecords = records.filter { it.status == ImportStatus.COMPLETED && it.imageId != null }
                val forms = filteredRecords.map { record ->
                    //可以在form中指定一种时间类型，若不指定就使用设置中默认的类型
                    val orderTime = when(form.analyseTimeBy ?: appdata.setting.import.setOrderTimeBy) {
                        ImportOption.TimeType.CREATE_TIME -> record.fileCreateTime ?: record.importTime
                        ImportOption.TimeType.UPDATE_TIME -> record.fileUpdateTime ?: record.importTime
                        ImportOption.TimeType.IMPORT_TIME -> record.importTime
                    }

                    IllustBatchUpdateForm(target = listOf(record.imageId!!), orderTimeBegin = optOf(orderTime), orderTimeEnd = optOf(orderTime))
                }
                forms.forEach { illustManager.bulkUpdate(it) }
            }
        }
    }

    fun getWatcherStatus(): ImportWatcherRes {
        return ImportWatcherRes(pathWatcher.isOpen, pathWatcher.statisticCount, pathWatcher.errors)
    }

    fun updateWatcherStatus(form: ImportWatcherForm) {
        pathWatcher.isOpen = form.isOpen
    }
}
