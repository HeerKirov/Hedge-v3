package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.backend.exporter.BackendExporter
import com.heerkirov.hedge.server.components.backend.exporter.IllustMetadataExporterTask
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.events.CollectionImagesChanged
import com.heerkirov.hedge.server.events.IllustCreated
import com.heerkirov.hedge.server.events.IllustUpdated
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.kit.IllustKit
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.utils.DateTime
import com.heerkirov.hedge.server.utils.filterInto
import com.heerkirov.hedge.server.utils.ktorm.asSequence
import com.heerkirov.hedge.server.utils.ktorm.first
import com.heerkirov.hedge.server.utils.types.undefined
import org.ktorm.dsl.*
import org.ktorm.entity.*
import java.time.LocalDate
import java.time.LocalDateTime

class IllustManager(private val data: DataRepository,
                    private val bus: EventBus,
                    private val kit: IllustKit,
                    private val sourceManager: SourceDataManager,
                    private val partitionManager: PartitionManager,
                    private val backendExporter: BackendExporter) {
    /**
     * 创建新的image。
     * @throws ResourceNotExist ("site", string) 给出的site不存在
     * @throws ResourceNotExist ("parentId", number) 给定的parent不存在，或者它不是一个collection。给出id
     * @throws ResourceNotExist ("topics", number[]) 部分topics资源不存在。给出不存在的topic id列表
     * @throws ResourceNotExist ("authors", number[]) 部分authors资源不存在。给出不存在的author id列表
     * @throws ResourceNotExist ("tags", number[]) 部分tags资源不存在。给出不存在的tag id列表
     * @throws ResourceNotSuitable ("tags", number[]) 部分tags资源不适用。地址段不适用于此项。给出不适用的tag id列表
     * @throws ConflictingGroupMembersError 发现标签冲突组
     */
    fun newImage(fileId: Int, parentId: Int? = null,
                 sourceSite: String? = null, sourceId: Long? = null, sourcePart: Int? = null,
                 description: String = "", score: Int? = null, favorite: Boolean = false, tagme: Illust.Tagme = Illust.Tagme.EMPTY,
                 partitionTime: LocalDate, orderTime: Long, createTime: LocalDateTime): Int {
        val collection = if(parentId == null) null else {
            data.db.sequenceOf(Illusts)
                .firstOrNull { (Illusts.type eq IllustModelType.COLLECTION) and (Illusts.id eq parentId) }
                ?: throw be(ResourceNotExist("parentId", parentId))
        }

        partitionManager.addItemInPartition(partitionTime)

        val (newSourceDataId, newSourceSite, newSourceId) = sourceManager.checkSourceSite(sourceSite, sourceId, sourcePart)
            ?.let { (source, sourceId) -> sourceManager.validateAndCreateSourceDataIfNotExist(source, sourceId) }
            ?: Triple(null, null, null)

        val exportedDescription = if(description.isEmpty() && collection != null) collection.exportedDescription else description
        val exportedScore = if(score == null && collection != null) collection.exportedScore else score

        val id = data.db.insertAndGenerateKey(Illusts) {
            set(it.type, if(collection != null) IllustModelType.IMAGE_WITH_PARENT else IllustModelType.IMAGE)
            set(it.parentId, parentId)
            set(it.fileId, fileId)
            set(it.cachedChildrenCount, 0)
            set(it.cachedBookCount, 0)
            set(it.sourceDataId, newSourceDataId)
            set(it.sourceSite, newSourceSite)
            set(it.sourceId, newSourceId)
            set(it.sourcePart, sourcePart)
            set(it.description, description)
            set(it.score, score)
            set(it.favorite, favorite)
            set(it.tagme, tagme)
            set(it.exportedDescription, exportedDescription)
            set(it.exportedScore, exportedScore)
            set(it.partitionTime, partitionTime)
            set(it.orderTime, orderTime)
            set(it.createTime, createTime)
            set(it.updateTime, createTime)
        } as Int

        if(score != null && collection != null && collection.score == null) {
            //指定image的score、存在parent且未指定parent的score时，为parent重新计算exported score
            val newParentExportedScore = data.db.from(Illusts)
                .select(sum(Illusts.score).aliased("score"), count(Illusts.id).aliased("count"))
                .where { (Illusts.parentId eq collection.id) and Illusts.score.isNotNull() }
                .first().let {
                    val sum = it.getInt("score")
                    val count = it.getInt("count")
                    (sum + score) * 1.0 / (count + 1)
                }
            data.db.update(Illusts) {
                where { it.id eq collection.id }
                set(it.exportedScore, newParentExportedScore.toInt())
            }
        }

        //对tag进行校验和分析，导出
        kit.updateMeta(id, creating = true, newTags = undefined(), newTopics = undefined(), newAuthors = undefined(), copyFromParent = collection?.id)

        if(collection != null) {
            //对parent做重导出。尽管重导出有多个可分离的部分，但分开判定太费劲且收益不高，就统一只要有parent就重导出了
            backendExporter.add(IllustMetadataExporterTask(collection.id, exportFirstCover = true, exportMetaTag = true))
        }

        bus.emit(IllustCreated(id, IllustType.IMAGE))

        return id
    }

    /**
     * 创建新的collection。
     * @throws ResourceNotExist ("images", number[]) 给出的部分images不存在。给出不存在的image id列表
     */
    fun newCollection(formImages: List<Int>, formDescription: String, formScore: Int?, formFavorite: Boolean, formTagme: Illust.Tagme): Int {
        val images = unfoldImages(formImages, sorted = false)
        val (fileId, scoreFromSub, partitionTime, orderTime) = kit.getExportedPropsFromList(images)

        val createTime = DateTime.now()

        val id = data.db.insertAndGenerateKey(Illusts) {
            set(it.type, IllustModelType.COLLECTION)
            set(it.parentId, null)
            set(it.fileId, fileId)
            set(it.cachedChildrenCount, images.size)
            set(it.cachedBookCount, 0)
            set(it.sourceDataId, null)
            set(it.sourceSite, null)
            set(it.sourceId, null)
            set(it.sourcePart, null)
            set(it.description, formDescription)
            set(it.score, formScore)
            set(it.favorite, formFavorite)
            set(it.tagme, formTagme)
            set(it.exportedDescription, formDescription)
            set(it.exportedScore, formScore ?: scoreFromSub)
            set(it.partitionTime, partitionTime)
            set(it.orderTime, orderTime)
            set(it.createTime, createTime)
            set(it.updateTime, createTime)
        } as Int

        updateSubImages(id, images)

        kit.refreshAllMeta(id, copyFromChildren = true)

        bus.emit(IllustCreated(id, IllustType.COLLECTION))

        return id
    }

    fun setCollectionImages(collectionId: Int, images: List<Illust>, score: Int? = null) {
        val (fileId, scoreFromSub, partitionTime, orderTime) = kit.getExportedPropsFromList(images)

        data.db.update(Illusts) {
            where { it.id eq collectionId }
            set(it.fileId, fileId)
            set(it.cachedChildrenCount, images.size)
            set(it.exportedScore, score ?: scoreFromSub)
            set(it.partitionTime, partitionTime)
            set(it.orderTime, orderTime)
            set(it.updateTime, DateTime.now())
        }

        updateSubImages(collectionId, images)

        kit.refreshAllMeta(collectionId, copyFromChildren = true)

        bus.emit(CollectionImagesChanged(collectionId))
    }

    /**
     * 应用images列表，设置images的parent为当前collection，同时处理重导出关系。
     * 对于移入/移除当前集合的项，对其属性进行重导出；对于被移出的旧parent，也对其进行处理。
     */
    private fun updateSubImages(collectionId: Int, images: List<Illust>) {
        val imageIds = images.asSequence().map { it.id }.toSet()
        val oldImageIds = data.db.from(Illusts).select(Illusts.id)
            .where { Illusts.parentId eq collectionId }
            .asSequence().map { it[Illusts.id]!! }.toSet()

        //处理移出项，修改它们的type/parentId，并视情况执行重新导出
        val deleteIds = oldImageIds - imageIds
        data.db.update(Illusts) {
            where { it.id inList deleteIds }
            set(it.type, IllustModelType.IMAGE)
            set(it.parentId, null)
        }
        backendExporter.add(deleteIds.map { IllustMetadataExporterTask(it, exportDescription = true, exportScore = true, exportMetaTag = true) })

        //处理移入项，修改它们的type/parentId，并视情况执行重新导出
        val addIds = imageIds - oldImageIds
        data.db.update(Illusts) {
            where { it.id inList addIds }
            set(it.parentId, collectionId)
            set(it.type, IllustModelType.IMAGE_WITH_PARENT)
        }
        backendExporter.add(addIds.map { IllustMetadataExporterTask(it, exportDescription = true, exportScore = true, exportMetaTag = true) })
        //这些image有旧的parent，需要对旧parent做重新导出
        val now = DateTime.now()
        images.asSequence()
            .filter { it.id in addIds && it.parentId != null && it.parentId != collectionId }
            .groupBy { it.parentId!! }
            .forEach { (parentId, images) ->
                processCollectionChildrenRemoved(parentId, images, now)
                bus.emit(CollectionImagesChanged(parentId))
            }
        //这些image的collection发生变化，发送事件
        images.asSequence()
            .filter { it.parentId != collectionId }
            .map { it.id }
            .forEach { bus.emit(IllustUpdated(it, IllustType.IMAGE, generalUpdated = false, metaTagUpdated = false, relatedItemsUpdated = true, sourceDataUpdated = false)) }
    }

    /**
     * 由于向collection加入了新的child，因此需要处理所有属性的重导出，包括firstCover, count, score, metaTags。
     * 这个函数不是向collection加入child，而是已经加入了，为此需要处理关系，而且必须同步处理。
     */
    fun processCollectionChildrenAdded(collectionId: Int, addedImage: Illust,
                                       updateTime: LocalDateTime? = null, exportMetaTags: Boolean = false, exportScore: Boolean = false) {
        val firstImage = data.db.sequenceOf(Illusts).filter { (it.parentId eq collectionId) and (it.id notEq addedImage.id) }.sortedBy { it.orderTime }.firstOrNull()

        data.db.update(Illusts) {
            where { it.id eq collectionId }
            if(firstImage == null || firstImage.orderTime >= addedImage.orderTime) {
                //只有当现有列表的第一项的排序顺位>=被放入的项时，才发起更新。
                //如果顺位<当前项，那么旧parent的封面肯定是这个第一项而不是当前项，就不需要更新。
                set(it.fileId, addedImage.fileId)
                set(it.partitionTime, addedImage.partitionTime)
                set(it.orderTime, addedImage.orderTime)
            }
            set(it.cachedChildrenCount, it.cachedChildrenCount plus 1)
            set(it.updateTime, updateTime ?: DateTime.now())
        }

        if(exportMetaTags || exportScore) {
            backendExporter.add(IllustMetadataExporterTask(collectionId, exportScore = exportScore, exportMetaTag = exportMetaTags))
        }
    }

    /**
     * 由于从collection移除了child，因此需要处理所有属性的重导出，包括firstCover, count, score, metaTags。若已净空，则会直接移除collection。
     * 这个函数不是从collection移除child，而是已经移除了，为此需要处理关系，而且必须同步处理。
     */
    fun processCollectionChildrenRemoved(collectionId: Int, removedImages: List<Illust>,
                                         updateTime: LocalDateTime? = null, exportMetaTags: Boolean = false, exportScore: Boolean = false) {
        //关键属性(fileId, partitionTime, orderTime)的重导出不延后到metaExporter，在事务内立即完成
        val firstImage = data.db.sequenceOf(Illusts)
            .filter { (it.parentId eq collectionId) and (it.id notInList removedImages.map(Illust::id)) }
            .sortedBy { it.orderTime }
            .firstOrNull()
        if(firstImage != null) {
            data.db.update(Illusts) {
                where { it.id eq collectionId }
                if(firstImage.orderTime >= removedImages.minOf(Illust::orderTime)) {
                    //只有被移除的项存在任意项的排序顺位<=当剩余列表的第一项时，才发起更新。
                    //因为如果移除项顺位<当前第一项，那么旧parent的封面肯定是这个第一项而不是移除的项，就不需要更新。
                    set(it.fileId, firstImage.fileId)
                    set(it.partitionTime, firstImage.partitionTime)
                    set(it.orderTime, firstImage.orderTime)
                }
                set(it.cachedChildrenCount, it.cachedChildrenCount minus removedImages.size)
                set(it.updateTime, updateTime ?: DateTime.now())
            }

            if(exportMetaTags || exportScore) {
                backendExporter.add(IllustMetadataExporterTask(collectionId, exportScore = exportScore, exportMetaTag = exportMetaTags))
            }
        }else{
            //此collection已经没有项了，将其删除
            data.db.delete(Illusts) { it.id eq collectionId }
            data.db.delete(IllustTagRelations) { it.illustId eq collectionId }
            data.db.delete(IllustAuthorRelations) { it.illustId eq collectionId }
            data.db.delete(IllustTopicRelations) { it.illustId eq collectionId }
            data.db.delete(IllustAnnotationRelations) { it.illustId eq collectionId }
        }
    }

    /**
     * 将一个images id序列映射成illust列表。其中的collection会被展开成其children列表，并去重。
     * @param sorted 返回结果保持有序。默认开启。对book是有必要的，但collection就没有这个需要。控制这个开关来做查询效率优化。
     */
    fun unfoldImages(imageIds: List<Int>, paramNameWhenThrow: String = "images", sorted: Boolean = true): List<Illust> {
        if(imageIds.isEmpty()) throw be(ParamRequired(paramNameWhenThrow))
        val result = data.db.sequenceOf(Illusts).filter { it.id inList imageIds }.toList()
        //数量不够表示有imageId不存在
        if(result.size < imageIds.size) throw be(ResourceNotExist(paramNameWhenThrow, imageIds.toSet() - result.asSequence().map { it.id }.toSet()))

        if(sorted) {
            //有序时不能做太多优化，就把原id列表依次展开查询
            val resultMap = result.associateBy { it.id }
            return imageIds.asSequence().map { id -> resultMap[id]!! }.flatMap { illust ->
                if(illust.type != IllustModelType.COLLECTION) sequenceOf(illust) else {
                    data.db.sequenceOf(Illusts)
                        .filter { it.parentId eq illust.id }
                        .sortedBy { it.orderTime.asc() }
                        .asKotlinSequence()
                }
            }.distinctBy { it.id }.toList()
        }else{
            //对于collection，做一个易用性处理，将它们的所有子项包括在images列表中; 对于image/image_with_parent，直接加入images列表
            val (collectionResult, imageResult) = result.filterInto { it.type == IllustModelType.COLLECTION }
            //非有序时，一口气查询出所有的children
            val childrenResult = if(collectionResult.isEmpty()) emptyList() else {
                data.db.sequenceOf(Illusts)
                    .filter { it.parentId inList collectionResult.map(Illust::id) }
                    .toList()
            }
            //然后将children和image一起去重
            return (imageResult + childrenResult).distinctBy { it.id }
        }
    }
}