package com.heerkirov.hedge.server.components.backend.similar

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.res.SourceTagPath
import com.heerkirov.hedge.server.enums.FindSimilarEntityType
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.model.ImportImage
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
        data class ImageRow(val partitionTime: LocalDate, val sourceSite: String?, val sourceId: Long?, val sourcePart: Int?, val sourcePartName: String?, val collectionId: Any?, val bookIds: List<Int>, val cloneImage: ImportImage.CloneImageFrom?, val fingerprint: Fingerprint?)

        val notExistIds = mutableListOf<Int>()
        val entityInfoList = mutableListOf<ImportImageEntityInfo>()

        val finalImportIds = importIds ?: data.db.from(ImportImages).select(ImportImages.id).map { it[ImportImages.id]!! }

        for (importId in finalImportIds) {
            val cache = loadByImportImageCache[importId]
            if(cache != null) entityInfoList.add(cache) else notExistIds.add(importId)
        }

        if(notExistIds.isNotEmpty()) {
            val imagesMap = data.db.from(ImportImages)
                .leftJoin(FileFingerprints, FileFingerprints.fileId eq ImportImages.fileId)
                .select(
                    ImportImages.id, ImportImages.partitionTime, ImportImages.sourceSite, ImportImages.sourceId, ImportImages.sourcePart, ImportImages.sourcePartName, ImportImages.collectionId, ImportImages.bookIds, ImportImages.preference,
                    FileFingerprints.fileId, FileFingerprints.pHashSimple, FileFingerprints.pHash, FileFingerprints.dHashSimple, FileFingerprints.dHash
                )
                .where { ImportImages.id inList notExistIds }
                .associateBy({ it[ImportImages.id]!! }) {
                    val cid: Any? = it[ImportImages.collectionId]?.run {
                        if (startsWith('#')) substring(1).toInt() else if (startsWith('@')) substring(1) else this
                    }
                    val fingerprint = it[FileFingerprints.fileId]?.run {
                        Fingerprint(it[FileFingerprints.pHashSimple]!!, it[FileFingerprints.dHashSimple]!!, it[FileFingerprints.pHash]!!, it[FileFingerprints.dHash]!!)
                    }
                    ImageRow(it[ImportImages.partitionTime]!!, it[ImportImages.sourceSite], it[ImportImages.sourceId], it[ImportImages.sourcePart], it[ImportImages.sourcePartName], cid, it[ImportImages.bookIds] ?: emptyList(), it[ImportImages.preference]?.cloneImage, fingerprint)
                }

            val imagePartitionsMap = if (!enableFilterBy || !config.filterByPartition) emptyMap() else {
                data.db.from(ImportImages)
                    .select(ImportImages.id, ImportImages.partitionTime)
                    .where { ImportImages.id inList notExistIds }
                    .associateBy({ it[ImportImages.id]!! }) { it[ImportImages.partitionTime]!! }
            }

            val imageSourceTagsMap = if (!enableFilterBy || config.filterBySourceTagType.isEmpty()) emptyMap() else {
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
                        it += ImportImages.id inList notExistIds
                    }
                    .asSequence()
                    .groupBy({ it[ImportImages.id]!! }) { SourceTags.createEntity(it) }
            }

            val imageSourceRelationsMap = if (!config.findBySourceRelation) emptyMap() else {
                data.db.from(ImportImages)
                    .innerJoin(SourceDatas, (SourceDatas.sourceSite eq ImportImages.sourceSite) and (SourceDatas.sourceId eq ImportImages.sourceId))
                    .select(ImportImages.id, SourceDatas.relations)
                    .where { ImportImages.id inList notExistIds }
                    .associateBy({ it[ImportImages.id]!! }) { it[SourceDatas.relations] ?: emptyList() }
            }

            val imageSourceBooksMap = if (!config.findBySourceRelation) emptyMap() else {
                data.db.from(ImportImages)
                    .innerJoin(SourceDatas, (SourceDatas.sourceSite eq ImportImages.sourceSite) and (SourceDatas.sourceId eq ImportImages.sourceId))
                    .innerJoin(SourceBookRelations, SourceDatas.id eq SourceBookRelations.sourceDataId)
                    .select(ImportImages.id, SourceBookRelations.sourceBookId)
                    .where { ImportImages.id inList notExistIds }
                    .asSequence()
                    .groupBy({ it[ImportImages.id]!! }) { it[SourceBookRelations.sourceBookId]!! }
            }

            val imageSourceMarksMap = if (!config.findBySourceMark) emptyMap() else {
                data.db.from(ImportImages)
                    .innerJoin(SourceDatas, (SourceDatas.sourceSite eq ImportImages.sourceSite) and (SourceDatas.sourceId eq ImportImages.sourceId))
                    .innerJoin(SourceMarks, SourceMarks.sourceDataId eq SourceDatas.id)
                    .select(SourceMarks.relatedSourceDataId, SourceMarks.markType)
                    .where { ImportImages.id inList notExistIds }
                    .asSequence()
                    .groupBy({ it[ImportImages.id]!! }) { it[SourceMarks.relatedSourceDataId]!! to it[SourceMarks.markType]!! }
            }

            val cloneImageCollectionIdMap = data.db.from(Illusts).select(Illusts.id, Illusts.parentId)
                .where { Illusts.parentId.isNotNull() and (Illusts.id inList imagesMap.values.mapNotNull { if (it.cloneImage?.props?.collection == true) it.cloneImage.fromImageId else null }) }
                .asSequence()
                .map { it[Illusts.id]!! to it[Illusts.parentId]!! }
                .toMap()
            val cloneImageBookIdsMap = data.db.from(BookImageRelations)
                .select(BookImageRelations.bookId, BookImageRelations.imageId)
                .where { BookImageRelations.imageId inList imagesMap.values.mapNotNull { if (it.cloneImage?.props?.books == true) it.cloneImage.fromImageId else null } }
                .asSequence()
                .groupBy({ it[BookImageRelations.imageId]!! }) { it[BookImageRelations.bookId]!! }
                .toMap()

            for ((id, row) in imagesMap) {
                val sourceIdentity = if(config.findBySourceIdentity && row.sourceSite != null && row.sourceId != null) Tuple4(row.sourceSite, row.sourceId, row.sourcePart, row.sourcePartName) else null
                val sourceRelations = if(config.findBySourceRelation) imageSourceRelationsMap[id] ?: emptyList() else null
                val sourceBooks = if(config.findBySourceRelation) imageSourceBooksMap[id] ?: emptyList() else null
                val sourceMarks = if(config.findBySourceMark) imageSourceMarksMap[id] ?: emptyList() else null
                val collectionId = if(row.cloneImage?.props?.collection == true && row.cloneImage.fromImageId in cloneImageCollectionIdMap) cloneImageCollectionIdMap[row.cloneImage.fromImageId]!! else row.collectionId
                val bookIds = row.bookIds + (if(row.cloneImage?.props?.books == true && row.cloneImage.fromImageId in cloneImageBookIdsMap) cloneImageBookIdsMap[row.cloneImage.fromImageId]!! else emptyList())
                val entityInfo = ImportImageEntityInfo(id,
                    imagePartitionsMap[id] ?: LocalDate.MIN,
                    imageSourceTagsMap[id] ?: emptyList(),
                    sourceIdentity, sourceRelations, sourceBooks, sourceMarks,
                    row.fingerprint, collectionId, bookIds, row.cloneImage)

                loadByImportImageCache[id] = entityInfo
                entityInfoList.add(entityInfo)
            }
        }
        return entityInfoList
    }

    fun loadByPartition(partitionTime: LocalDate, enableFilterBy: Boolean = false): List<EntityInfo> {
        return loadByPartitionCache.computeIfAbsent(partitionTime) {
            val imageIds = data.db.from(Illusts)
                .select(Illusts.id)
                .where { (Illusts.partitionTime eq partitionTime) and ((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) }
                .map { it[Illusts.id]!! }

            val importIds = data.db.from(ImportImages)
                .select(ImportImages.id)
                .where { ImportImages.partitionTime eq partitionTime }
                .map { it[ImportImages.id]!! }

            loadByImage(imageIds, enableFilterBy) + loadByImportImage(importIds, enableFilterBy)
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

            val importIds = data.db.from(ImportImages)
                .innerJoin(SourceDatas, (SourceDatas.sourceSite eq ImportImages.sourceSite) and (SourceDatas.sourceId eq ImportImages.sourceId))
                .innerJoin(SourceTagRelations, SourceTagRelations.sourceDataId eq SourceDatas.id)
                .select(ImportImages.id)
                .where { SourceTagRelations.sourceTagId inList sourceTagIds }
                .map { it[ImportImages.id]!! }

            loadByImage(imageIds, enableFilterBy) + loadByImportImage(importIds, enableFilterBy)
        }
    }

    private val loadByImageCache = mutableMapOf<Int, IllustEntityInfo>()
    private val loadByImportImageCache = mutableMapOf<Int, ImportImageEntityInfo>()
    private val loadByPartitionCache = mutableMapOf<LocalDate, List<EntityInfo>>()
    private val loadByAuthorCache = mutableMapOf<String, List<EntityInfo>>()
    private val loadByTopicCache = mutableMapOf<String, List<EntityInfo>>()
    private val loadBySourceTagCache = mutableMapOf<Int, List<EntityInfo>>()
}