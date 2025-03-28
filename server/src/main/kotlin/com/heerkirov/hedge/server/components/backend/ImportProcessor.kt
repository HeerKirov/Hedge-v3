package com.heerkirov.hedge.server.components.backend

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.appdata.ImportOption
import com.heerkirov.hedge.server.components.backend.similar.SimilarFinder
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.form.IllustImageCreateForm
import com.heerkirov.hedge.server.dto.form.SourceDataUpdateForm
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.*
import com.heerkirov.hedge.server.events.FileProcessError
import com.heerkirov.hedge.server.events.FileReady
import com.heerkirov.hedge.server.events.ImportUpdated
import com.heerkirov.hedge.server.exceptions.BusinessException
import com.heerkirov.hedge.server.functions.manager.*
import com.heerkirov.hedge.server.library.framework.Component
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.model.ImportRecord
import com.heerkirov.hedge.server.utils.DateTime.toPartitionDate
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import com.heerkirov.hedge.server.utils.letIf
import com.heerkirov.hedge.server.utils.tuples.Tuple4
import org.ktorm.dsl.*
import org.ktorm.entity.filter
import org.ktorm.entity.sequenceOf
import org.ktorm.entity.toList
import org.slf4j.LoggerFactory
import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * 处理ImportImage相关杂务的后台任务。
 * - 监听collection、book、folder的删除事件，据此清除importImage中的preferences。
 */
interface ImportProcessor : Component

class ImportProcessorImpl(private val appdata: AppDataManager,
                          private val data: DataRepository,
                          private val bus: EventBus, taskScheduler: TaskSchedulerModule,
                          private val similarFinder: SimilarFinder,
                          private val illustManager: IllustManager,
                          private val sourceAnalyzeManager: SourceAnalyzeManager,
                          private val sourceSiteManager: SourceSiteManager,
                          private val sourceDataManager: SourceDataManager,
                          private val sourceMappingManager: SourceMappingManager) : ImportProcessor {
    private val log = LoggerFactory.getLogger(ImportProcessor::class.java)

    init {
        bus.on(arrayOf(FileReady::class, FileProcessError::class)) {
            it.which {
                all<FileReady>(::onFileReady)
                all<FileProcessError>(::onFileError)
            }
        }
        taskScheduler.dayEnd(::autoClean)
    }

    private fun autoClean() {
        data.db.transaction {
            val now = Instant.now()
            //检测未删除的COMPLETED的记录，将其清理
            //因为是COMPLETED的记录，所以不需要清理file
            val cleanCount = data.db.update(ImportRecords) {
                where { it.status eq ImportStatus.COMPLETED and it.deleted.not() }
                set(it.deleted, true)
                set(it.deletedTime, now)
            }

            //检测7天之前或者超过3000条的已删除记录，将其彻底清理
            //file会在记录被标记为已删除时就清理掉，因此这里也不需要清理file
            val deadline1 = now.minus(7, ChronoUnit.DAYS)
            val deadline2 = data.db.from(ImportRecords)
                .select(ImportRecords.deletedTime)
                .where { ImportRecords.deleted }
                .orderBy(ImportRecords.deletedTime.desc())
                .limit(3000, 1)
                .firstOrNull()
                ?.get(ImportRecords.deletedTime)
            val deadline = if(deadline2 == null || deadline1 > deadline2) deadline1 else deadline2
            val deleteCount = data.db.delete(ImportRecords) { it.deleted and (it.deletedTime lessEq deadline) }
            if(cleanCount > 0 || deleteCount > 0) {
                log.info("Import record: $cleanCount cleaned, $deleteCount deleted.")
            }
        }
    }

    private fun onFileReady(events: Collection<FileReady>) {
        val fileIds = events.map { it.fileId }
        data.db.transaction {
            val importImages = data.db.sequenceOf(ImportRecords).filter { it.imageId.isNull() and (it.fileId inList fileIds) }.toList()
            completeImportImages(importImages)
        }
    }

    private fun onFileError(events: Collection<FileProcessError>) {
        val fileIds = events.map { it.fileId }
        data.db.transaction {
            val importImages = data.db.sequenceOf(ImportRecords).filter { it.imageId.isNull() and (it.fileId inList fileIds) }.toList()
            errorImportImages(importImages, events)
        }
    }

    private fun completeImportImages(importRecords: List<ImportRecord>) {
        val setting = appdata.setting

        val errors = mutableMapOf<Int, ImportRecord.StatusInfo>()
        val oks = mutableListOf<IllustImageCreateForm>()
        val sourceForms = mutableListOf<Pair<SourceDataIdentity, SourceDataUpdateForm>>()
        val mappingTagCache = mutableMapOf<SourceDataIdentity, Tuple4<List<Int>, List<Int>, List<Int>, Illust.Tagme>?>()

        for(record in importRecords) {
            val orderTime = when(setting.import.setOrderTimeBy) {
                ImportOption.TimeType.CREATE_TIME -> record.fileCreateTime ?: record.importTime
                ImportOption.TimeType.UPDATE_TIME -> record.fileUpdateTime ?: record.importTime
                ImportOption.TimeType.IMPORT_TIME -> record.importTime
            }

            val partitionTime = orderTime.toPartitionDate(setting.server.timeOffsetHour)

            val source = if(record.statusInfo?.retryWithManualSource != null) {
                Pair(record.statusInfo.retryWithManualSource, null)
            }else if(setting.import.autoAnalyseSourceData) {
                try {
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
                } ?: if(record.statusInfo?.retryAndAllowNoSource != true && setting.import.preventNoneSourceData) {
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
                    null
                }
            }else null

            val metaTags = if(setting.import.autoReflectMetaTag && source != null) { mappingTagCache.computeIfAbsent(SourceDataIdentity(source.first.sourceSite, source.first.sourceId), ::reflectMetaTag) }else null

            val tagme = if(!setting.import.setTagmeOfTag) Illust.Tagme.EMPTY else {
                (Illust.Tagme.TAG + Illust.Tagme.AUTHOR + Illust.Tagme.TOPIC + Illust.Tagme.SOURCE)
                    .letIf(source != null && setting.meta.autoCleanTagme) { it - Illust.Tagme.SOURCE }
                    .letIf(metaTags != null && setting.meta.autoCleanTagme) { it - metaTags!!.f4 }
            }

            if(source?.second != null) sourceForms.add(SourceDataIdentity(source.first.sourceSite, source.first.sourceId) to source.second!!)

            oks.add(IllustImageCreateForm(record.id, record.fileId, partitionTime, orderTime, record.importTime, tagme = tagme, source = source?.first, tags = metaTags?.f1, topics = metaTags?.f2, authors = metaTags?.f3))
        }

        for ((sourceIdentity, updateForm) in sourceForms) {
            sourceDataManager.createOrUpdateSourceData(sourceIdentity.sourceSite, sourceIdentity.sourceId,
                title = updateForm.title, description = updateForm.description, tags = updateForm.tags,
                books = updateForm.books, relations = updateForm.relations,
                additionalInfo = updateForm.additionalInfo.letOpt { it.associateBy({ f -> f.field }) { f -> f.value } },
                publishTime = updateForm.publishTime,
                status = updateForm.status, allowUpdate = true, appendUpdate = true)
        }

        if(errors.isNotEmpty()) {
            data.db.batchUpdate(ImportRecords) {
                for ((id, statusInfo) in errors) {
                    item {
                        where { it.id eq id }
                        set(it.status, ImportStatus.ERROR)
                        set(it.statusInfo, statusInfo)
                    }
                }
            }

            bus.emit(errors.map { ImportUpdated(it.key,
                status = ImportStatus.ERROR,
                thumbnailError = it.value.thumbnailError ?: false,
                fingerprintError = it.value.fingerprintError ?: false,
                sourceAnalyseError = it.value.sourceAnalyseError ?: false,
                sourceAnalyseNone = it.value.sourceAnalyseNone ?: false
            ) })
        }

        if(oks.isNotEmpty()) {
            val importToImageIds = try {
                illustManager.bulkNewImage(oks)
            }catch (e: Exception) {
                val statusInfo = ImportRecord.StatusInfo(messages = if(e.message != null) listOf(e.message!!) else null)
                data.db.update(ImportRecords) {
                    where { it.id inList oks.map { f -> f.importId } }
                    set(it.status, ImportStatus.ERROR)
                    set(it.statusInfo, statusInfo)
                }
                bus.emit(oks.map { ImportUpdated(it.importId, status = ImportStatus.ERROR) })
                return
            }

            data.db.batchUpdate(ImportRecords) {
                for ((importId, imageId) in importToImageIds) {
                    item {
                        where { it.id eq importId }
                        set(it.status, ImportStatus.COMPLETED)
                        set(it.statusInfo, null)
                        set(it.imageId, imageId)
                    }
                }
            }

            if(setting.findSimilar.autoFindSimilar) {
                similarFinder.add(FindSimilarTask.TaskSelectorOfImages(importToImageIds.values.toList()), setting.findSimilar.autoTaskConf ?: setting.findSimilar.defaultTaskConf)
            }

            bus.emit(oks.map { ImportUpdated(it.importId, status = ImportStatus.COMPLETED) })
        }
    }

    private fun errorImportImages(importRecords: List<ImportRecord>, events: Collection<FileProcessError>) {
        val fileIdToImportIds = importRecords.associateBy({ it.fileId }) { it.id }
        val errors = mutableMapOf<Int, ImportRecord.StatusInfo>()
        for (event in events) {
            val importId = fileIdToImportIds[event.fileId]
            if(importId != null) {
                errors[importId] = ImportRecord.StatusInfo(
                    thumbnailError = event.type == "THUMBNAIL",
                    fingerprintError = event.type == "FINGERPRINT",
                    messages = listOf(event.message)
                )
            }
        }

        if(errors.isNotEmpty()) {
            data.db.batchUpdate(ImportRecords) {
                for ((id, statusInfo) in errors) {
                    item {
                        where { it.id eq id }
                        set(it.status, ImportStatus.ERROR)
                        set(it.statusInfo, statusInfo)
                    }
                }
            }

            bus.emit(errors.map { ImportUpdated(it.key,
                status = ImportStatus.ERROR,
                thumbnailError = it.value.thumbnailError ?: false,
                fingerprintError = it.value.fingerprintError ?: false,
                sourceAnalyseError = it.value.sourceAnalyseError ?: false,
                sourceAnalyseNone = it.value.sourceAnalyseNone ?: false
            ) })
        }
    }

    private fun reflectMetaTag(identity: SourceDataIdentity): Tuple4<List<Int>, List<Int>, List<Int>, Illust.Tagme>? {
        val (site, sourceId) = identity

        val sourceDataId = data.db.from(SourceDatas).select(SourceDatas.id)
            .where { (SourceDatas.sourceSite eq site) and (SourceDatas.sourceId eq sourceId) }
            .firstOrNull()?.get(SourceDatas.id)
        if(sourceDataId == null) return null

        val sourceTags = data.db.from(SourceTags)
            .innerJoin(SourceTagRelations, (SourceTags.id eq SourceTagRelations.sourceTagId) and (SourceTagRelations.sourceDataId eq sourceDataId))
            .select(SourceTags.type, SourceTags.code)
            .map { SourceTagPath(site, it[SourceTags.type]!!, it[SourceTags.code]!!) }
        if(sourceTags.isEmpty()) return null

        val siteDetail = sourceSiteManager.get(site)!!
        val setting = appdata.setting
        val resultTags = mutableSetOf<Int>()
        val resultTopics = mutableSetOf<Int>()
        val resultAuthors = mutableSetOf<Int>()
        val enableTag = MetaType.TAG in setting.import.reflectMetaTagType
        val enableTopic = MetaType.TOPIC in setting.import.reflectMetaTagType
        val enableAuthor = MetaType.AUTHOR in setting.import.reflectMetaTagType
        val mappingTags = sourceMappingManager.batchQuery(sourceTags)
        val resolveConflictParents by lazy { mappingTags.asSequence().flatMap { it.mappings }.map { it.metaTag }.filterIsInstance<TopicSimpleRes>().filter { it.type == TagTopicType.COPYRIGHT || it.type == TagTopicType.IP }.map { it.id }.toSet() }
        for (mappingTag in mappingTags) {
            if(mappingTag.mappings.size >= 2 && setting.meta.resolveTagConflictByParent && enableTopic && mappingTag.mappings.all { it.metaTag is TopicSimpleRes && it.metaTag.type == TagTopicType.CHARACTER }) {
                //当一个sourceTag存在至少2个映射目标，目标都是character，且符合resolveTagConflictByParent条件时，需要根据父标签限定选择其一
                for (mapping in mappingTag.mappings) {
                    val topic = mapping.metaTag as TopicSimpleRes
                    var cur: Triple<Int, Int?, Int?>? = null
                    do {
                        //这里对每一个topic循环查询它的所有parent，当存在任意parent在resolveConflictParents集合内时，此映射有效
                        cur = data.db.from(Topics)
                            .select(Topics.id, Topics.parentId, Topics.parentRootId)
                            .where { Topics.id eq (cur?.second ?: topic.id) }
                            .map { Triple(it[Topics.id]!!, it[Topics.parentId], it[Topics.parentRootId]) }
                            .firstOrNull()
                        if(cur != null && (cur.second in resolveConflictParents || cur.third in resolveConflictParents)) {
                            resultTopics.add(topic.id)
                            break
                        }
                    } while (cur?.second != null)
                }
            }else{
                for (mapping in mappingTag.mappings) {
                    when(mapping.metaType) {
                        MetaType.AUTHOR -> if(enableAuthor) resultAuthors.add((mapping.metaTag as AuthorSimpleRes).id)
                        MetaType.TOPIC -> if(enableTopic) resultTopics.add((mapping.metaTag as TopicSimpleRes).id)
                        MetaType.TAG -> if(enableTag) resultTags.add((mapping.metaTag as TagSimpleRes).id)
                    }
                }
            }
        }

        //进行混合图集检测。author/topic类型符合检测后，其结果不会输出
        val notReflectForAuthor = detectImageSet(siteDetail, MetaType.AUTHOR, sourceTags, mappingTags)
        val notReflectForTopic = detectImageSet(siteDetail, MetaType.TOPIC, sourceTags, mappingTags)
        val notReflectForTag = detectImageSet(siteDetail, MetaType.TAG, sourceTags, mappingTags)

        //根据映射移除对应的tagme。映射从缓存获取，依次尝试topic、author和tag，获取它们在当前site下对应的所有sourceTagType
        //当某种类型的对应的sourceTagType的所有sourceTag全部有映射条目时，此tagme可以消除，因此加入minusTagme
        //开启onlyCharacterTopic时，就要求必须至少有一个CHARACTER
        val minusTagme: Illust.Tagme = (Illust.Tagme.EMPTY as Illust.Tagme)
            .letIf(setting.import.setTagmeOfTag) { tagme ->
                tagme.letIf(enableTag && !notReflectForTag && getSiteMetaTypeToTagTypeMapping(siteDetail, MetaType.TAG).let { types -> mappingTags.filter { it.type in types } }.let { it.isNotEmpty() && it.all { t -> t.mappings.isNotEmpty() } }) { it + Illust.Tagme.TAG }
                    .letIf(enableAuthor && !notReflectForAuthor && getSiteMetaTypeToTagTypeMapping(siteDetail, MetaType.AUTHOR).let { types -> mappingTags.filter { it.type in types } }.let { it.isNotEmpty() && it.all { t -> t.mappings.isNotEmpty() } }) { it + Illust.Tagme.AUTHOR }
                    .letIf(enableTopic && !notReflectForTopic && getSiteMetaTypeToTagTypeMapping(siteDetail, MetaType.TOPIC)
                        .let { types -> mappingTags.filter { it.type in types } }
                        .let { it.isNotEmpty() && it.all { t -> t.mappings.isNotEmpty() } && if(setting.meta.onlyCharacterTopic) { it.flatMap { t -> t.mappings }.any { t -> t.metaTag is TopicSimpleRes && t.metaTag.type == TagTopicType.CHARACTER } }else true }
                    ) { it + Illust.Tagme.TOPIC }
            }

        return if(minusTagme == Illust.Tagme.EMPTY && (resultTopics.isEmpty() || notReflectForTopic) && (resultAuthors.isEmpty() || notReflectForAuthor) && (resultTags.isEmpty() || notReflectForTag)) null
        else Tuple4(
            if(notReflectForTag) emptyList() else resultTags.toList(),
            if(notReflectForTopic) emptyList() else resultTopics.toList(),
            if(notReflectForAuthor) emptyList() else resultAuthors.toList(),
            minusTagme
        )
    }

    /**
     * 根据site的定义表，提取元数据标签类型对应的所有tagType类型。
     */
    private fun getSiteMetaTypeToTagTypeMapping(site: SourceSiteRes, metaType: MetaType): List<String> {
        when(metaType) {
            MetaType.TAG -> {
                return site.tagTypeMappings.filter { (_, v) -> v == MetaType.TAG.name }.map { (k, _) -> k }
            }
            MetaType.TOPIC -> {
                val names = TagTopicType.entries.map { it.name }
                return site.tagTypeMappings.filter { (_, v) -> v in names }.map { (k, _) -> k }
            }
            MetaType.AUTHOR -> {
                val names = TagAuthorType.entries.map { it.name }
                return site.tagTypeMappings.filter { (_, v) -> v in names }.map { (k, _) -> k }
            }
        }
    }

    /**
     * 根据site类型，检测是否符合ImageSet混合图集的定义。
     */
    private fun detectImageSet(site: SourceSiteRes, metaType: MetaType, sourceTags: List<SourceTagPath>, mappingTags: List<SourceMappingBatchQueryResult>): Boolean {
        return if(site.isBuiltin && (site.name == "ehentai" || site.name == "imhentai")) {
            when(metaType) {
                MetaType.TOPIC -> sourceTags.any { (it.sourceTagType == "category" || it.sourceTagType == "reclass") && (it.sourceTagCode == "image-set" || it.sourceTagCode == "western") }
                        || site.tagTypeMappings.filterValues { it == TagTopicType.IP.name }.keys.let { types -> sourceTags.count { it.sourceTagType in types } } >= 2
                        || getSiteMetaTypeToTagTypeMapping(site, MetaType.TOPIC).let { types -> sourceTags.count { it.sourceTagType in types } } >= 8
                MetaType.AUTHOR -> getSiteMetaTypeToTagTypeMapping(site, MetaType.AUTHOR).let { types -> sourceTags.count { it.sourceTagType in types } } >= 4
                MetaType.TAG -> sourceTags.any { (it.sourceTagType == "category" || it.sourceTagType == "reclass") && (it.sourceTagCode == "image-set" || it.sourceTagCode == "western") }
            }
        }else if(site.isBuiltin && (site.name == "pixiv")) {
            when(metaType) {
                MetaType.TOPIC -> {
                    val topics = mappingTags.flatMap { it.mappings }.filter { it.metaType == MetaType.TOPIC }.map { it.metaTag as TopicSimpleRes }
                    topics.size >= 8 || topics.count { it.type == TagTopicType.IP } >= 2
                }
                MetaType.AUTHOR -> false
                MetaType.TAG -> true
            }
        }else if(site.isBuiltin && (site.name == "sankakucomplex")) {
            when(metaType) {
                MetaType.TOPIC -> getSiteMetaTypeToTagTypeMapping(site, MetaType.TOPIC).let { types -> sourceTags.count { it.sourceTagType in types } } >= 8
                MetaType.AUTHOR -> getSiteMetaTypeToTagTypeMapping(site, MetaType.AUTHOR).let { types -> sourceTags.count { it.sourceTagType in types } } >= 4
                MetaType.TAG -> false
            }
        }else{
            false
        }
    }
}
