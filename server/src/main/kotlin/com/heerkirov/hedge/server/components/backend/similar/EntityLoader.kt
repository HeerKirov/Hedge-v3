package com.heerkirov.hedge.server.components.backend.similar

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.res.SourceTagPath
import com.heerkirov.hedge.server.enums.FindSimilarEntityType
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.utils.filterInto
import com.heerkirov.hedge.server.utils.ktorm.asSequence
import com.heerkirov.hedge.server.utils.tuples.Tuple4
import com.heerkirov.hedge.server.utils.types.FindSimilarEntityKey
import org.ktorm.dsl.*
import java.time.LocalDate

/**
 * 数据加载器。所有数据都从这里读。
 * - 依据不同的条件，执行限定条件的查询。
 * - 根据config，提前查询所需关键信息，存储在entityInfo中。通过selector获取的信息会包含filter by相关信息。
 * - 在它自身的生命周期内，缓存所有查询结果，以及根据查询方式获得的不同查询。
 */
class EntityLoader(private val data: DataRepository, private val config: FindSimilarTask.TaskConfig) {
    fun loadBySelector(selector: FindSimilarTask.TaskSelector): List<EntityInfo> {
        return when (selector) {
            is FindSimilarTask.TaskSelectorOfImage -> loadByImage(selector.imageIds, enableFilterBy = true)
            is FindSimilarTask.TaskSelectorOfImportImage -> loadByImportImage(selector.importIds, enableFilterBy = true)
            is FindSimilarTask.TaskSelectorOfPartition -> loadByPartition(selector.partitionTime, enableFilterBy = true)
            is FindSimilarTask.TaskSelectorOfAuthor -> loadByAuthor(selector.authorIds, enableFilterBy = true)
            is FindSimilarTask.TaskSelectorOfTopic -> loadByTopic(selector.topicIds, enableFilterBy = true)
            is FindSimilarTask.TaskSelectorOfSourceTag -> loadBySourceTag(selector.sourceTags, enableFilterBy = true)
        }
    }

    fun loadByEntityKeys(entityKeys: Iterable<FindSimilarEntityKey>): Map<FindSimilarEntityKey, EntityInfo> {
        val (illusts, importImages) = entityKeys.filterInto { it.type == FindSimilarEntityType.ILLUST }
        val illustsRes = loadByImage(illusts.map { it.id }, enableFilterBy = false).associateBy { it.id }
        val importImagesRes = loadByImportImage(importImages.map { it.id }, enableFilterBy = false).associateBy { it.id }
        val ret = mutableMapOf<FindSimilarEntityKey, EntityInfo>()
        illusts.forEach { entityKey ->
            if(entityKey.id in illustsRes) ret[entityKey] = illustsRes[entityKey.id]!!
        }
        importImages.forEach { entityKey ->
            if(entityKey.id in importImagesRes) ret[entityKey] = importImagesRes[entityKey.id]!!
        }
        return ret
    }

    private fun loadByImage(imageIds: List<Int>, enableFilterBy: Boolean = false): List<IllustEntityInfo> {
        data class ImageRow(val parentId: Int?, val partitionTime: LocalDate, val sourceSite: String?, val sourceId: Long?, val sourcePart: Int?, val sourcePartName: String?, val fingerprint: Fingerprint?)

        val notExistIds = mutableListOf<Int>()
        val entityInfoList = mutableListOf<IllustEntityInfo>()
        for (imageId in imageIds) {
            val cache = loadByImageCache[imageId]
            if(cache != null) entityInfoList.add(cache) else notExistIds.add(imageId)
        }

        if(notExistIds.isNotEmpty()) {
            val imagesMap = data.db.from(Illusts)
                .leftJoin(FileFingerprints, FileFingerprints.fileId eq Illusts.fileId)
                .select(Illusts.id, Illusts.parentId, Illusts.partitionTime, Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, Illusts.sourcePartName, FileFingerprints.fileId, FileFingerprints.pHashSimple, FileFingerprints.pHash, FileFingerprints.dHashSimple, FileFingerprints.dHash)
                .where { ((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (Illusts.id inList notExistIds) }
                .associateBy({ it[Illusts.id]!! }) {
                    val fingerprint = it[FileFingerprints.fileId]?.run {
                        Fingerprint(it[FileFingerprints.pHashSimple]!!, it[FileFingerprints.dHashSimple]!!, it[FileFingerprints.pHash]!!, it[FileFingerprints.dHash]!!)
                    }
                    ImageRow(it[Illusts.parentId], it[Illusts.partitionTime]!!, it[Illusts.sourceSite], it[Illusts.sourceId], it[Illusts.sourcePart], it[Illusts.sourcePartName], fingerprint)
                }

            val imageAuthorsMap = if(!enableFilterBy || !config.filterByAuthor) emptyMap() else {
                data.db.from(IllustAuthorRelations)
                    .select(IllustAuthorRelations.authorId, IllustAuthorRelations.illustId)
                    .where { IllustAuthorRelations.illustId inList notExistIds }
                    .asSequence()
                    .groupBy({ it[IllustAuthorRelations.illustId]!! }) { it[IllustAuthorRelations.authorId]!! }
            }

            val imageTopicsMap = if(!enableFilterBy || !config.filterByTopic) emptyMap() else {
                data.db.from(IllustTopicRelations)
                    .select(IllustTopicRelations.topicId, IllustTopicRelations.illustId)
                    .where { IllustTopicRelations.illustId inList notExistIds }
                    .asSequence()
                    .groupBy({ it[IllustTopicRelations.illustId]!! }) { it[IllustTopicRelations.topicId]!! }
            }

            val imageSourceTagsMap = if(!enableFilterBy || config.filterBySourceTagType.isEmpty()) emptyMap() else {
                val sourceTagTypeCondition = config.filterBySourceTagType
                    .map { (SourceTags.site eq it.sourceSite) and (SourceTags.type eq it.tagType) }
                    .reduce { acc, binaryExpression -> acc and binaryExpression }

                data.db.from(SourceTags)
                    .innerJoin(SourceTagRelations, SourceTagRelations.sourceTagId eq SourceTags.id)
                    .innerJoin(Illusts, Illusts.sourceDataId eq SourceTagRelations.sourceDataId)
                    .select(SourceTags.id, SourceTags.type, SourceTags.site, SourceTags.code, SourceTags.name, SourceTags.otherName, Illusts.id)
                    .where { (Illusts.id inList notExistIds) and sourceTagTypeCondition }
                    .asSequence()
                    .groupBy({ it[Illusts.id]!! }) { SourceTags.createEntity(it) }
            }

            val imageSourceRelationsMap = if(!config.findBySourceRelation) emptyMap() else {
                data.db.from(Illusts)
                    .innerJoin(SourceDatas, SourceDatas.id eq Illusts.sourceDataId)
                    .select(Illusts.id, SourceDatas.relations)
                    .where { ((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (Illusts.id inList notExistIds) }
                    .associateBy({ it[Illusts.id]!! }) { it[SourceDatas.relations] ?: emptyList() }
            }

            val imageSourceBooksMap = if(!config.findBySourceRelation) emptyMap() else {
                data.db.from(Illusts)
                    .innerJoin(SourceBookRelations, SourceBookRelations.sourceDataId eq Illusts.sourceDataId)
                    .select(Illusts.id, SourceBookRelations.sourceBookId)
                    .where { ((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (Illusts.id inList notExistIds) }
                    .asSequence()
                    .groupBy({ it[Illusts.id]!! }) { it[SourceBookRelations.sourceBookId]!! }
            }

            val imageSourceMarksMap = if(!config.findBySourceMark) emptyMap() else {
                data.db.from(Illusts)
                    .innerJoin(SourceMarks, SourceMarks.sourceDataId eq Illusts.sourceDataId)
                    .select(SourceMarks.relatedSourceDataId, SourceMarks.markType)
                    .where { Illusts.id inList notExistIds }
                    .asSequence()
                    .groupBy({ it[Illusts.id]!! }) { it[SourceMarks.relatedSourceDataId]!! to it[SourceMarks.markType]!! }
            }

            for ((id, row) in imagesMap) {
                val sourceIdentity = if(config.findBySourceIdentity && row.sourceSite != null && row.sourceId != null) Tuple4(row.sourceSite, row.sourceId, row.sourcePart, row.sourcePartName) else null
                val sourceRelations = if(config.findBySourceRelation) imageSourceRelationsMap[id] ?: emptyList() else null
                val sourceBooks = if(config.findBySourceRelation) imageSourceBooksMap[id] ?: emptyList() else null
                val sourceMarks = if(config.findBySourceMark) imageSourceMarksMap[id] ?: emptyList() else null
                val entityInfo = IllustEntityInfo(id,
                    row.partitionTime,
                    imageSourceTagsMap[id] ?: emptyList(),
                    sourceIdentity,
                    sourceRelations,
                    sourceBooks,
                    sourceMarks,
                    row.fingerprint,
                    row.parentId,
                    imageAuthorsMap[id] ?: emptyList(),
                    imageTopicsMap[id] ?: emptyList())
                loadByImageCache[id] = entityInfo
                entityInfoList.add(entityInfo)
            }
        }

        return entityInfoList
    }

    fun loadByImportImage(importIds: List<Int>? = null, enableFilterBy: Boolean = false): List<EntityInfo> {
        return emptyList()
    }

    fun loadByPartition(partitionTime: LocalDate, enableFilterBy: Boolean = false): List<EntityInfo> {
        return loadByPartitionCache.computeIfAbsent(partitionTime) {
            val imageIds = data.db.from(Illusts)
                .select(Illusts.id)
                .where { (Illusts.partitionTime eq partitionTime) and ((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) }
                .map { it[Illusts.id]!! }

            loadByImage(imageIds, enableFilterBy)
        }
    }

    fun loadByAuthor(authorIds: List<Int>, enableFilterBy: Boolean = false): List<EntityInfo> {
        return loadByAuthorCache.computeIfAbsent(authorIds.joinToString()) {
            val imageIds = data.db.from(Illusts)
                .innerJoin(IllustAuthorRelations, IllustAuthorRelations.illustId eq Illusts.id)
                .select(Illusts.id)
                .where { ((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (IllustAuthorRelations.authorId inList authorIds) }
                .groupBy(Illusts.id)
                .map { it[Illusts.id]!! }

            loadByImage(imageIds, enableFilterBy)
        }
    }

    fun loadByTopic(topicIds: List<Int>, enableFilterBy: Boolean = false): List<EntityInfo> {
        return loadByTopicCache.computeIfAbsent(topicIds.joinToString()) {
            val imageIds = data.db.from(Illusts)
                .innerJoin(IllustTopicRelations, IllustTopicRelations.illustId eq Illusts.id)
                .select(Illusts.id)
                .where { ((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (IllustTopicRelations.topicId inList topicIds) }
                .groupBy(Illusts.id)
                .map { it[Illusts.id]!! }

            loadByImage(imageIds, enableFilterBy)
        }
    }

    fun loadBySourceTag(sourceTags: List<SourceTagPath>, enableFilterBy: Boolean = false): List<EntityInfo> {
        return loadBySourceTagCache.computeIfAbsent(sourceTags.hashCode()) {
            val sourceTagIds = sourceTags
                .groupBy({ Pair(it.sourceSite, it.sourceTagType) }) { it.sourceTagCode }
                .flatMap { (e, codes) ->
                    data.db.from(SourceTags)
                        .select(SourceTags.id)
                        .where { (SourceTags.site eq e.first) and (SourceTags.type eq e.second) and (SourceTags.code inList codes) }
                        .map { it[SourceTags.id]!! }
                }

            val imageIds = data.db.from(Illusts)
                .innerJoin(SourceTagRelations, SourceTagRelations.sourceDataId eq Illusts.sourceDataId)
                .select(Illusts.id)
                .where { ((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (SourceTagRelations.sourceTagId inList sourceTagIds) }
                .groupBy(Illusts.id)
                .map { it[Illusts.id]!! }

            loadByImage(imageIds, enableFilterBy)
        }
    }

    private val loadByImageCache = mutableMapOf<Int, IllustEntityInfo>()
    private val loadByPartitionCache = mutableMapOf<LocalDate, List<EntityInfo>>()
    private val loadByAuthorCache = mutableMapOf<String, List<EntityInfo>>()
    private val loadByTopicCache = mutableMapOf<String, List<EntityInfo>>()
    private val loadBySourceTagCache = mutableMapOf<Int, List<EntityInfo>>()
}