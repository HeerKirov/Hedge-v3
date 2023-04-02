package com.heerkirov.hedge.server.components.backend.similar

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.utils.ktorm.asSequence
import org.ktorm.dsl.*
import java.time.LocalDate

class TargetEntityLoader(private val data: DataRepository) {
    fun load(selector: FindSimilarTask.TaskSelector, config: FindSimilarTask.TaskConfig): List<TargetEntity> {
        return when (selector) {
            is FindSimilarTask.TaskSelectorOfImage -> loadByImage(selector, config)
            is FindSimilarTask.TaskSelectorOfImportImage -> loadByImportImage(selector, config)
            is FindSimilarTask.TaskSelectorOfPartition -> loadByPartition(selector, config)
            is FindSimilarTask.TaskSelectorOfAuthor -> loadByAuthor(selector, config)
            is FindSimilarTask.TaskSelectorOfTopic -> loadByTopic(selector, config)
            is FindSimilarTask.TaskSelectorOfSourceTag -> loadBySourceTag(selector, config)
        }
    }

    private fun loadByImage(selector: FindSimilarTask.TaskSelectorOfImage, config: FindSimilarTask.TaskConfig): List<TargetEntity> {
        val imagePartitionsMap = if(!config.filterByPartition) emptyMap() else {
            data.db.from(Illusts)
                .select(Illusts.id, Illusts.partitionTime)
                .where { ((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (Illusts.id inList selector.imageIds) }
                .associateBy({ it[Illusts.id]!! }) { it[Illusts.partitionTime]!! }
        }

        val imageAuthorsMap = if(!config.filterByAuthor) emptyMap() else {
             data.db.from(IllustAuthorRelations)
                .select(IllustAuthorRelations.authorId, IllustAuthorRelations.illustId)
                .where { IllustAuthorRelations.illustId inList selector.imageIds }
                .asSequence()
                .groupBy({ it[IllustAuthorRelations.illustId]!! }) { it[IllustAuthorRelations.authorId]!! }
        }

        val imageTopicsMap = if(!config.filterByTopic) emptyMap() else {
            data.db.from(IllustTopicRelations)
                .select(IllustTopicRelations.topicId, IllustTopicRelations.illustId)
                .where { IllustTopicRelations.illustId inList selector.imageIds }
                .asSequence()
                .groupBy({ it[IllustTopicRelations.illustId]!! }) { it[IllustTopicRelations.topicId]!! }
        }

        val imageSourceTagsMap = if(config.filterBySourceTagType.isEmpty()) emptyMap() else {
            val sourceTagTypeCondition = config.filterBySourceTagType
                .map { (SourceTags.site eq it.sourceSite) and (SourceTags.type eq it.tagType) }
                .reduce { acc, binaryExpression -> acc and binaryExpression }

            data.db.from(SourceTags)
                .innerJoin(SourceTagRelations, SourceTagRelations.sourceTagId eq SourceTags.id)
                .innerJoin(Illusts, Illusts.sourceDataId eq SourceTagRelations.sourceDataId)
                .select(SourceTags.id, SourceTags.type, SourceTags.site, SourceTags.code, SourceTags.name, SourceTags.otherName, Illusts.id)
                .where { (Illusts.id inList selector.imageIds) and sourceTagTypeCondition }
                .asSequence()
                .groupBy({ it[Illusts.id]!! }) { SourceTags.createEntity(it) }
        }

        return selector.imageIds.map {
            ImageEntity(it,
                imagePartitionsMap[it] ?: LocalDate.MIN,
                imageSourceTagsMap[it] ?: emptyList(),
                imageAuthorsMap[it] ?: emptyList(),
                imageTopicsMap[it] ?: emptyList())
        }
    }

    private fun loadByImportImage(selector: FindSimilarTask.TaskSelectorOfImportImage, config: FindSimilarTask.TaskConfig): List<TargetEntity> {
        val imagePartitionsMap = if(!config.filterByPartition) emptyMap() else {
            data.db.from(ImportImages)
                .select(ImportImages.id, ImportImages.partitionTime)
                .where { ImportImages.id inList selector.importIds }
                .associateBy({ it[ImportImages.id]!! }) { it[ImportImages.partitionTime]!! }
        }

        val imageSourceTagsMap = if(config.filterBySourceTagType.isEmpty()) emptyMap() else {
            val sourceTagTypeCondition = config.filterBySourceTagType
                .map { (SourceTags.site eq it.sourceSite) and (SourceTags.type eq it.tagType) }
                .reduce { acc, binaryExpression -> acc and binaryExpression }

            data.db.from(SourceTags)
                .innerJoin(SourceTagRelations, SourceTagRelations.sourceTagId eq SourceTags.id)
                .innerJoin(SourceDatas, SourceDatas.id eq SourceTagRelations.sourceDataId)
                .innerJoin(ImportImages, (ImportImages.sourceSite eq SourceDatas.sourceSite) and (ImportImages.sourceId eq SourceDatas.sourceId))
                .select(SourceTags.id, SourceTags.type, SourceTags.site, SourceTags.code, SourceTags.name, SourceTags.otherName, ImportImages.id)
                .where { (ImportImages.id inList selector.importIds) and sourceTagTypeCondition }
                .asSequence()
                .groupBy({ it[ImportImages.id]!! }) { SourceTags.createEntity(it) }
        }

        return selector.importIds.map {
            ImportImageEntity(it,
                imagePartitionsMap[it] ?: LocalDate.MIN,
                imageSourceTagsMap[it] ?: emptyList())
        }
    }

    private fun loadByPartition(selector: FindSimilarTask.TaskSelectorOfPartition, config: FindSimilarTask.TaskConfig): List<TargetEntity> {
        val imageIds = data.db.from(Illusts)
            .select(Illusts.id)
            .where { (Illusts.partitionTime eq selector.partitionTime) and ((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) }
            .map { it[Illusts.id]!! }

        val importIds = data.db.from(ImportImages)
            .select(ImportImages.id)
            .where { ImportImages.partitionTime eq selector.partitionTime }
            .map { it[ImportImages.id]!! }

        return loadByImage(FindSimilarTask.TaskSelectorOfImage(imageIds), config) + loadByImportImage(FindSimilarTask.TaskSelectorOfImportImage(importIds), config)
    }

    private fun loadByAuthor(selector: FindSimilarTask.TaskSelectorOfAuthor, config: FindSimilarTask.TaskConfig): List<TargetEntity> {
        val imageIds = data.db.from(Illusts)
            .innerJoin(IllustAuthorRelations, IllustAuthorRelations.illustId eq Illusts.id)
            .select(Illusts.id)
            .where { ((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (IllustAuthorRelations.authorId inList selector.authorIds) }
            .groupBy(Illusts.id)
            .map { it[Illusts.id]!! }

        return loadByImage(FindSimilarTask.TaskSelectorOfImage(imageIds), config)
    }

    private fun loadByTopic(selector: FindSimilarTask.TaskSelectorOfTopic, config: FindSimilarTask.TaskConfig): List<TargetEntity> {
        val imageIds = data.db.from(Illusts)
            .innerJoin(IllustTopicRelations, IllustTopicRelations.illustId eq Illusts.id)
            .select(Illusts.id)
            .where { ((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (IllustTopicRelations.topicId inList selector.topicIds) }
            .groupBy(Illusts.id)
            .map { it[Illusts.id]!! }

        return loadByImage(FindSimilarTask.TaskSelectorOfImage(imageIds), config)
    }

    private fun loadBySourceTag(selector: FindSimilarTask.TaskSelectorOfSourceTag, config: FindSimilarTask.TaskConfig): List<TargetEntity> {
        val imageIds = data.db.from(Illusts)
            .innerJoin(SourceTagRelations, SourceTagRelations.sourceDataId eq Illusts.sourceDataId)
            .innerJoin(SourceTags, SourceTags.id eq SourceTagRelations.sourceTagId)
            .select(Illusts.id)
            .where { ((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (SourceTags.site eq selector.sourceSite) and (SourceTags.code inList selector.sourceTags) }
            .groupBy(Illusts.id)
            .map { it[Illusts.id]!! }

        val importIds = data.db.from(ImportImages)
            .innerJoin(SourceDatas, (SourceDatas.sourceSite eq ImportImages.sourceSite) and (SourceDatas.sourceId eq ImportImages.sourceId))
            .innerJoin(SourceTagRelations, SourceTagRelations.sourceDataId eq SourceDatas.id)
            .innerJoin(SourceTags, SourceTags.id eq SourceTagRelations.sourceTagId)
            .select(ImportImages.id)
            .where { (SourceTags.site eq selector.sourceSite) and (SourceTags.code inList selector.sourceTags) }
            .map { it[ImportImages.id]!! }

        return loadByImage(FindSimilarTask.TaskSelectorOfImage(imageIds), config) + loadByImportImage(FindSimilarTask.TaskSelectorOfImportImage(importIds), config)
    }
}