package com.heerkirov.hedge.server.components.backend

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.appdata.ImportOption
import com.heerkirov.hedge.server.components.backend.similar.SimilarFinder
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.components.status.AppStatusDriver
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.form.IllustImageCreateForm
import com.heerkirov.hedge.server.dto.form.SourceDataUpdateForm
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.*
import com.heerkirov.hedge.server.events.FileProcessError
import com.heerkirov.hedge.server.events.FileReady
import com.heerkirov.hedge.server.events.ImportUpdated
import com.heerkirov.hedge.server.exceptions.BusinessException
import com.heerkirov.hedge.server.functions.manager.IllustManager
import com.heerkirov.hedge.server.functions.manager.SourceAnalyzeManager
import com.heerkirov.hedge.server.functions.manager.SourceDataManager
import com.heerkirov.hedge.server.functions.manager.SourceMappingManager
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
import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * 处理ImportImage相关杂务的后台任务。
 * - 监听collection、book、folder的删除事件，据此清除importImage中的preferences。
 */
interface ImportProcessor : Component

class ImportProcessorImpl(private val appStatus: AppStatusDriver,
                          private val appdata: AppDataManager,
                          private val data: DataRepository,
                          private val bus: EventBus,
                          private val similarFinder: SimilarFinder,
                          private val illustManager: IllustManager,
                          private val sourceAnalyzeManager: SourceAnalyzeManager,
                          private val sourceDataManager: SourceDataManager,
                          private val sourceMappingManager: SourceMappingManager) : ImportProcessor {
    init {
        bus.on(arrayOf(FileReady::class, FileProcessError::class)) {
            it.which {
                all<FileReady>(::onFileReady)
                all<FileProcessError>(::onFileError)
            }
        }
    }

    override fun close() {
        if(appStatus.status == AppLoadStatus.READY) {
            autoClean()
        }
    }

    private fun autoClean() {
        data.db.transaction {
            val now = Instant.now()
            //检测未删除的COMPLETED的记录，将其清理
            //因为是COMPLETED的记录，所以不需要清理file
            data.db.update(ImportRecords) {
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
            data.db.delete(ImportRecords) { it.deleted and (it.deletedTime lessEq deadline) }
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

            val metaTags = if(setting.import.autoReflectMetaTag && source != null) {
                mappingTagCache.computeIfAbsent(SourceDataIdentity(source.first.sourceSite, source.first.sourceId)) { (site, sourceId) ->
                    val sourceDataId = data.db.from(SourceDatas).select(SourceDatas.id)
                        .where { (SourceDatas.sourceSite eq site) and (SourceDatas.sourceId eq sourceId) }
                        .firstOrNull()?.get(SourceDatas.id)
                    if(sourceDataId != null) {
                        val sourceTags = data.db.from(SourceTags)
                            .innerJoin(SourceTagRelations, (SourceTags.id eq SourceTagRelations.sourceTagId) and (SourceTagRelations.sourceDataId eq sourceDataId))
                            .select(SourceTags.type, SourceTags.code)
                            .map { SourceTagPath(source.first.sourceSite, it[SourceTags.type]!!, it[SourceTags.code]!!) }

                        if(sourceTags.isNotEmpty()) {
                            val resultTags = mutableSetOf<Int>()
                            val resultTopics = mutableSetOf<Int>()
                            val resultAuthors = mutableSetOf<Int>()
                            val mixedCounter = if(setting.import.notReflectForMixedSet) mutableMapOf<Any, Int>() else null
                            val typeReflector = if(setting.import.setTagmeOfTag || setting.import.notReflectForMixedSet) mutableMapOf<String, Pair<MetaType, Any>>() else null
                            val enableTag = MetaType.TAG in setting.import.reflectMetaTagType
                            val enableTopic = MetaType.TOPIC in setting.import.reflectMetaTagType
                            val enableAuthor = MetaType.AUTHOR in setting.import.reflectMetaTagType
                            val mappingTags = sourceMappingManager.batchQuery(sourceTags)
                            val resolveConflictParents by lazy { mappingTags.asSequence().flatMap { it.mappings }.map { it.metaTag }.filterIsInstance<TopicSimpleRes>().filter { it.type == TagTopicType.COPYRIGHT || it.type == TagTopicType.IP }.map { it.id }.toSet() }
                            for (mappingTag in mappingTags) {
                                if(mappingTag.mappings.size >= 2 && setting.import.resolveConflictByParent && enableTopic && mappingTag.mappings.all { it.metaTag is TopicSimpleRes && it.metaTag.type == TagTopicType.CHARACTER }) {
                                    //当一个sourceTag存在至少2个映射目标，目标都是character，且开启了resolveConflictByParent选项时，需要根据父标签限定选择其一
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
                                            MetaType.AUTHOR -> if(enableAuthor) {
                                                mixedCounter?.compute((mapping.metaTag as AuthorSimpleRes).type) { _, v -> if(v != null) v + 1 else 1 }
                                                resultAuthors.add((mapping.metaTag as AuthorSimpleRes).id)
                                            }
                                            MetaType.TOPIC -> if(enableTopic) {
                                                if(mixedCounter != null && (mapping.metaTag as TopicSimpleRes).type != TagTopicType.CHARACTER) mixedCounter.compute(mapping.metaTag.type) { _, v -> if(v != null) v + 1 else 1 }
                                                resultTopics.add((mapping.metaTag as TopicSimpleRes).id)
                                            }
                                            MetaType.TAG -> if(enableTag) resultTags.add((mapping.metaTag as TagSimpleRes).id)
                                        }
                                    }
                                }
                                if(typeReflector != null && mappingTag.mappings.isNotEmpty() && mappingTag.mappings.first().metaType in setting.import.reflectMetaTagType) {
                                    val first = mappingTag.mappings.first()
                                    val metaTagType = when(first.metaTag) {
                                        is AuthorSimpleRes -> first.metaTag.type
                                        is TopicSimpleRes -> first.metaTag.type
                                        is TagSimpleRes -> MetaType.TAG
                                        else -> throw UnsupportedOperationException()
                                    }
                                    typeReflector[mappingTag.type] = first.metaType to metaTagType
                                }
                            }

                            //根据typeReflector反推每种tagType对应的sourceTagType，然后统计sourceTag数量。(这么做是因为映射可能是不全面的，因此需要取原始标签数量，才能确认是不是混合集)
                            //当计数器监测到IP/COPYRIGHT数量>=2，或CHARACTER数量>=5，或AUTHOR数量>=3时，会将其认定为混合集。此时，使TOPIC或AUTHOR类型的标签全部不输出。
                            val authors: List<Int>?
                            val topics: List<Int>?
                            if(typeReflector != null && setting.import.notReflectForMixedSet) {
                                val counts = typeReflector.entries
                                    .filter { (_, v) -> v.second is TagAuthorType || v.second is TagTopicType }
                                    .groupBy({ (_, v) -> v.second }) { (k, _) -> k }
                                    .mapValues { (_, sourceTagTypes) -> sourceTags.count { it.sourceTagType in sourceTagTypes } }
                                authors = if(counts.filterKeys { it is TagAuthorType }.values.any { it >= 3 }) null else resultAuthors.toList()
                                topics = if(counts.getOrDefault(TagTopicType.CHARACTER, 0) >= 5 || counts.filterKeys { it is TagTopicType && it != TagTopicType.CHARACTER }.values.any { it >= 2 }) null else resultTopics.toList()
                            }else{
                                authors = resultAuthors.toList()
                                topics = resultTopics.toList()
                            }

                            //移除tagme的判定方法：根据存在的映射，可以大致推断某个site.type对应的MetaType类型。
                            //例如，可以推断ehentai.parody映射到TOPIC.IP类型，ehentai.character映射到TOPIC.CHARACTER类型，ehentai.male/female都映射到TAG类型。
                            //之后，从MetaType反推，看映射到它的所有site.type类型的来源标签是否都被映射了。如果是的，则可以移除对应的Tagme。
                            //例如，如果标签parody:A和parody:B都有映射，author:C和author:D只有C有映射，那么TOPIC可以移除，而AUTHOR不行。
                            //TODO 根据新的映射表重新编写判定逻辑，同时引入onlyCharacter的额外判定逻辑
                            var minusTagme: Illust.Tagme = Illust.Tagme.EMPTY
                            if(typeReflector != null && setting.import.setTagmeOfTag) {
                                for ((metaType, sourceTypes) in typeReflector.entries.groupBy({ it.value }) { it.key }) {
                                    val filteredSourceTags = mappingTags.filter { sourceTypes.any { type -> type == it.type } }
                                    if(filteredSourceTags.isNotEmpty() && filteredSourceTags.all { it.mappings.isNotEmpty() }) {
                                        when(metaType.first) {
                                            MetaType.AUTHOR -> if(authors != null) minusTagme += Illust.Tagme.AUTHOR
                                            MetaType.TOPIC -> if(topics != null) minusTagme += Illust.Tagme.TOPIC
                                            MetaType.TAG -> minusTagme +=  Illust.Tagme.TAG
                                        }
                                    }
                                }
                            }

                            if(minusTagme == Illust.Tagme.EMPTY && authors.isNullOrEmpty() && topics.isNullOrEmpty() && resultTags.isEmpty()) null else Tuple4(resultTags.toList(), topics ?: emptyList(), authors ?: emptyList(), minusTagme)
                        }else null
                    }else null
                }
            }else null

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
                books = updateForm.books, relations = updateForm.relations, links = updateForm.links,
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
}