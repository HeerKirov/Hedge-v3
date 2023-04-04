package com.heerkirov.hedge.server.components.backend.similar

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.enums.FindSimilarEntityType
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.utils.filterInto
import com.heerkirov.hedge.server.utils.ktorm.asSequence
import com.heerkirov.hedge.server.utils.runIf
import org.ktorm.dsl.*
import java.time.LocalDate

/**
 * 数据加载器。所有数据都从这里读。
 * - 依据不同的条件，执行限定条件的查询。
 * - 根据config，提前查询所需关键信息，存储在entityInfo中。通过selector获取的信息会包含filter by相关信息。
 * - 在它自身的生命周期内，缓存所有查询结果，以及根据查询方式获得的不同查询。
 * TODO 添加缓存机制
 */
class EntityLoader(private val data: DataRepository, private val config: FindSimilarTask.TaskConfig) {
    fun loadBySelector(selector: FindSimilarTask.TaskSelector): List<EntityInfo> {
        return when (selector) {
            is FindSimilarTask.TaskSelectorOfImage -> loadByImage(selector.imageIds, enableFilterBy = true)
            is FindSimilarTask.TaskSelectorOfImportImage -> loadByImportImage(selector.importIds, enableFilterBy = true)
            is FindSimilarTask.TaskSelectorOfPartition -> loadByPartition(selector.partitionTime, enableFilterBy = true)
            is FindSimilarTask.TaskSelectorOfAuthor -> loadByAuthor(selector.authorIds, enableFilterBy = true)
            is FindSimilarTask.TaskSelectorOfTopic -> loadByTopic(selector.topicIds, enableFilterBy = true)
            is FindSimilarTask.TaskSelectorOfSourceTag -> loadBySourceTag(selector.sourceSite, selector.sourceTags, enableFilterBy = true)
        }
    }

    fun loadByEntityKeys(entityKeys: Iterable<EntityKey>): Map<EntityKey, EntityInfo> {
        val (illusts, importImages) = entityKeys.filterInto { it.type == FindSimilarEntityType.ILLUST }
        val illustsRes = loadByImage(illusts.map { it.id }, enableFilterBy = false).associateBy { it.id }
        val importImagesRes = loadByImportImage(importImages.map { it.id }, enableFilterBy = false).associateBy { it.id }
        val ret = mutableMapOf<EntityKey, EntityInfo>()
        illusts.forEach { entityKey ->
            if(entityKey.id in illustsRes) ret[entityKey] = illustsRes[entityKey.id]!!
        }
        importImages.forEach { entityKey ->
            if(entityKey.id in importImagesRes) ret[entityKey] = importImagesRes[entityKey.id]!!
        }
        return ret
    }

    fun loadByImage(imageIds: List<Int>, enableFilterBy: Boolean = false): List<EntityInfo> {
        data class ImageRow(val parentId: Int?, val partitionTime: LocalDate, val sourceSite: String?, val sourceId: Long?, val sourcePart: Int?)

        val imagesMap = data.db.from(Illusts)
            .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
            .select(Illusts.id, Illusts.parentId, Illusts.partitionTime, Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart)
            .where { ((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (Illusts.id inList imageIds) }
            .associateBy({ it[Illusts.id]!! }) { ImageRow(it[Illusts.parentId], it[Illusts.partitionTime]!!, it[Illusts.sourceSite], it[Illusts.sourceId], it[Illusts.sourcePart]) }

        val imageAuthorsMap = if(!enableFilterBy || !config.filterByAuthor) emptyMap() else {
             data.db.from(IllustAuthorRelations)
                .select(IllustAuthorRelations.authorId, IllustAuthorRelations.illustId)
                .where { IllustAuthorRelations.illustId inList imageIds }
                .asSequence()
                .groupBy({ it[IllustAuthorRelations.illustId]!! }) { it[IllustAuthorRelations.authorId]!! }
        }

        val imageTopicsMap = if(!enableFilterBy || !config.filterByTopic) emptyMap() else {
            data.db.from(IllustTopicRelations)
                .select(IllustTopicRelations.topicId, IllustTopicRelations.illustId)
                .where { IllustTopicRelations.illustId inList imageIds }
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
                .where { (Illusts.id inList imageIds) and sourceTagTypeCondition }
                .asSequence()
                .groupBy({ it[Illusts.id]!! }) { SourceTags.createEntity(it) }
        }

        val imageSourceRelationsMap = if(!config.findBySourceRelation) emptyMap() else {
            data.db.from(Illusts)
                .innerJoin(SourceDatas, SourceDatas.id eq Illusts.sourceDataId)
                .select(Illusts.id, SourceDatas.relations)
                .where { ((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (Illusts.id inList imageIds) }
                .associateBy({ it[Illusts.id]!! }) { it[SourceDatas.relations] ?: emptyList() }
        }

        val imageSourceBooksMap = if(!config.findBySourceRelation) emptyMap() else {
            data.db.from(Illusts)
                .innerJoin(SourceBookRelations, SourceBookRelations.sourceDataId eq Illusts.sourceDataId)
                .select(Illusts.id, SourceBookRelations.sourceBookId)
                .where { ((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (Illusts.id inList imageIds) }
                .asSequence()
                .groupBy({ it[Illusts.id]!! }) { it[SourceBookRelations.sourceBookId]!! }
        }

        val imageSourceMarksMap = if(!config.findBySourceMark) emptyMap() else {
            data.db.from(Illusts)
                .innerJoin(SourceMarks, SourceMarks.sourceDataId eq Illusts.sourceDataId)
                .select(SourceMarks.relatedSourceDataId, SourceMarks.markType)
                .where { Illusts.id inList imageIds }
                .asSequence()
                .groupBy({ it[Illusts.id]!! }) { it[SourceMarks.relatedSourceDataId]!! to it[SourceMarks.markType]!! }
        }

        return imageIds.mapNotNull {
            val row = imagesMap[it] ?: return@mapNotNull null
            val sourceIdentity = if(config.findBySourceIdentity && row.sourceSite != null && row.sourceId != null) Triple(row.sourceSite, row.sourceId, row.sourcePart) else null
            val sourceRelations = if(config.findBySourceRelation) imageSourceRelationsMap[it] ?: emptyList() else null
            val sourceBooks = if(config.findBySourceRelation) imageSourceBooksMap[it] ?: emptyList() else null
            val sourceMarks = if(config.findBySourceMark) imageSourceMarksMap[it] ?: emptyList() else null
            IllustEntityInfo(it,
                row.partitionTime,
                imageSourceTagsMap[it] ?: emptyList(),
                sourceIdentity,
                sourceRelations,
                sourceBooks,
                sourceMarks,
                null,
                row.parentId,
                imageAuthorsMap[it] ?: emptyList(),
                imageTopicsMap[it] ?: emptyList())
        }
    }

    fun loadByImportImage(importIds: List<Int>? = null, enableFilterBy: Boolean = false): List<EntityInfo> {
        data class ImageRow(val partitionTime: LocalDate, val sourceSite: String?, val sourceId: Long?, val sourcePart: Int?)

        val imagesMap = data.db.from(ImportImages)
            .innerJoin(FileRecords, FileRecords.id eq ImportImages.fileId)
            .select(ImportImages.id, ImportImages.partitionTime, ImportImages.sourceSite, ImportImages.sourceId, ImportImages.sourcePart)
            .runIf(importIds != null) { where { ImportImages.id inList importIds!! } }
            .associateBy({ it[ImportImages.id]!! }) { ImageRow(it[ImportImages.partitionTime]!!, it[ImportImages.sourceSite], it[ImportImages.sourceId], it[ImportImages.sourcePart]) }

        val imagePartitionsMap = if(!enableFilterBy || !config.filterByPartition) emptyMap() else {
            data.db.from(ImportImages)
                .select(ImportImages.id, ImportImages.partitionTime)
                .runIf(importIds != null) { where { ImportImages.id inList importIds!! } }
                .associateBy({ it[ImportImages.id]!! }) { it[ImportImages.partitionTime]!! }
        }

        val imageSourceTagsMap = if(!enableFilterBy || config.filterBySourceTagType.isEmpty()) emptyMap() else {
            val sourceTagTypeCondition = config.filterBySourceTagType
                .map { (SourceTags.site eq it.sourceSite) and (SourceTags.type eq it.tagType) }
                .reduce { acc, binaryExpression -> acc and binaryExpression }

            data.db.from(SourceTags)
                .innerJoin(SourceTagRelations, SourceTagRelations.sourceTagId eq SourceTags.id)
                .innerJoin(SourceDatas, SourceDatas.id eq SourceTagRelations.sourceDataId)
                .innerJoin(ImportImages, (ImportImages.sourceSite eq SourceDatas.sourceSite) and (ImportImages.sourceId eq SourceDatas.sourceId))
                .select(SourceTags.id, SourceTags.type, SourceTags.site, SourceTags.code, SourceTags.name, SourceTags.otherName, ImportImages.id)
                .whereWithConditions {
                    it += sourceTagTypeCondition
                    if(importIds != null) it += ImportImages.id inList importIds
                }
                .asSequence()
                .groupBy({ it[ImportImages.id]!! }) { SourceTags.createEntity(it) }
        }

        val imageSourceRelationsMap = if(!config.findBySourceRelation) emptyMap() else {
            data.db.from(ImportImages)
                .innerJoin(SourceDatas, (SourceDatas.sourceSite eq ImportImages.sourceSite) and (SourceDatas.sourceId eq ImportImages.sourceId))
                .select(ImportImages.id, SourceDatas.relations)
                .runIf(importIds != null) { where { ImportImages.id inList importIds!! } }
                .associateBy({ it[ImportImages.id]!! }) { it[SourceDatas.relations] ?: emptyList() }
        }

        val imageSourceBooksMap = if(!config.findBySourceRelation) emptyMap() else {
            data.db.from(ImportImages)
                .innerJoin(SourceDatas, (SourceDatas.sourceSite eq ImportImages.sourceSite) and (SourceDatas.sourceId eq ImportImages.sourceId))
                .innerJoin(SourceBookRelations, SourceDatas.id eq SourceBookRelations.sourceDataId)
                .select(ImportImages.id, SourceBookRelations.sourceBookId)
                .runIf(importIds != null) { where { ImportImages.id inList importIds!! } }
                .asSequence()
                .groupBy({ it[ImportImages.id]!! }) { it[SourceBookRelations.sourceBookId]!! }
        }

        val imageSourceMarksMap = if(!config.findBySourceMark) emptyMap() else {
            data.db.from(ImportImages)
                .innerJoin(SourceDatas, (SourceDatas.sourceSite eq ImportImages.sourceSite) and (SourceDatas.sourceId eq ImportImages.sourceId))
                .innerJoin(SourceMarks, SourceMarks.sourceDataId eq SourceDatas.id)
                .select(SourceMarks.relatedSourceDataId, SourceMarks.markType)
                .runIf(importIds != null) { where { ImportImages.id inList importIds!! } }
                .asSequence()
                .groupBy({ it[ImportImages.id]!! }) { it[SourceMarks.relatedSourceDataId]!! to it[SourceMarks.markType]!! }
        }

        if(importIds != null) {
            return importIds.mapNotNull {
                val row = imagesMap[it] ?: return@mapNotNull null
                val sourceIdentity = if(config.findBySourceIdentity && row.sourceSite != null && row.sourceId != null) Triple(row.sourceSite, row.sourceId, row.sourcePart) else null
                val sourceRelations = if(config.findBySourceRelation) imageSourceRelationsMap[it] ?: emptyList() else null
                val sourceBooks = if(config.findBySourceRelation) imageSourceBooksMap[it] ?: emptyList() else null
                val sourceMarks = if(config.findBySourceMark) imageSourceMarksMap[it] ?: emptyList() else null
                ImportImageEntityInfo(it,
                    imagePartitionsMap[it] ?: LocalDate.MIN,
                    imageSourceTagsMap[it] ?: emptyList(),
                    sourceIdentity,
                    sourceRelations,
                    sourceBooks,
                    sourceMarks,
                    null)
            }
        }else{
            return imagesMap.map { (it, row) ->
                val sourceIdentity = if(config.findBySourceIdentity && row.sourceSite != null && row.sourceId != null) Triple(row.sourceSite, row.sourceId, row.sourcePart) else null
                val sourceRelations = if(config.findBySourceRelation) imageSourceRelationsMap[it] ?: emptyList() else null
                val sourceBooks = if(config.findBySourceRelation) imageSourceBooksMap[it] ?: emptyList() else null
                val sourceMarks = if(config.findBySourceMark) imageSourceMarksMap[it] ?: emptyList() else null
                ImportImageEntityInfo(it,
                    imagePartitionsMap[it] ?: LocalDate.MIN,
                    imageSourceTagsMap[it] ?: emptyList(),
                    sourceIdentity,
                    sourceRelations,
                    sourceBooks,
                    sourceMarks,
                    null)
            }
        }
    }

    fun loadByPartition(partitionTime: LocalDate, enableFilterBy: Boolean = false): List<EntityInfo> {
        val imageIds = data.db.from(Illusts)
            .select(Illusts.id)
            .where { (Illusts.partitionTime eq partitionTime) and ((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) }
            .map { it[Illusts.id]!! }

        val importIds = data.db.from(ImportImages)
            .select(ImportImages.id)
            .where { ImportImages.partitionTime eq partitionTime }
            .map { it[ImportImages.id]!! }

        return loadByImage(imageIds, enableFilterBy) + loadByImportImage(importIds, enableFilterBy)
    }

    fun loadByAuthor(authorIds: List<Int>, enableFilterBy: Boolean = false): List<EntityInfo> {
        val imageIds = data.db.from(Illusts)
            .innerJoin(IllustAuthorRelations, IllustAuthorRelations.illustId eq Illusts.id)
            .select(Illusts.id)
            .where { ((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (IllustAuthorRelations.authorId inList authorIds) }
            .groupBy(Illusts.id)
            .map { it[Illusts.id]!! }

        return loadByImage(imageIds, enableFilterBy)
    }

    fun loadByTopic(topicIds: List<Int>, enableFilterBy: Boolean = false): List<EntityInfo> {
        val imageIds = data.db.from(Illusts)
            .innerJoin(IllustTopicRelations, IllustTopicRelations.illustId eq Illusts.id)
            .select(Illusts.id)
            .where { ((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (IllustTopicRelations.topicId inList topicIds) }
            .groupBy(Illusts.id)
            .map { it[Illusts.id]!! }

        return loadByImage(imageIds, enableFilterBy)
    }

    fun loadBySourceTag(sourceSite: String, sourceTags: List<String>, enableFilterBy: Boolean = false): List<EntityInfo> {
        val imageIds = data.db.from(Illusts)
            .innerJoin(SourceTagRelations, SourceTagRelations.sourceDataId eq Illusts.sourceDataId)
            .innerJoin(SourceTags, SourceTags.id eq SourceTagRelations.sourceTagId)
            .select(Illusts.id)
            .where { ((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (SourceTags.site eq sourceSite) and (SourceTags.code inList sourceTags) }
            .groupBy(Illusts.id)
            .map { it[Illusts.id]!! }

        val importIds = data.db.from(ImportImages)
            .innerJoin(SourceDatas, (SourceDatas.sourceSite eq ImportImages.sourceSite) and (SourceDatas.sourceId eq ImportImages.sourceId))
            .innerJoin(SourceTagRelations, SourceTagRelations.sourceDataId eq SourceDatas.id)
            .innerJoin(SourceTags, SourceTags.id eq SourceTagRelations.sourceTagId)
            .select(ImportImages.id)
            .where { (SourceTags.site eq sourceSite) and (SourceTags.code inList sourceTags) }
            .map { it[ImportImages.id]!! }

        return loadByImage(imageIds, enableFilterBy) + loadByImportImage(importIds, enableFilterBy)
    }
}