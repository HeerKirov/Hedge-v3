package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.form.ImagePropsCloneForm
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.events.*
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.kit.IllustKit
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.model.ImportImage
import com.heerkirov.hedge.server.utils.duplicateCount
import com.heerkirov.hedge.server.utils.filterInto
import com.heerkirov.hedge.server.utils.ktorm.asSequence
import com.heerkirov.hedge.server.utils.ktorm.first
import com.heerkirov.hedge.server.utils.tuples.Tuple4
import com.heerkirov.hedge.server.utils.types.optOf
import org.ktorm.dsl.*
import org.ktorm.entity.*
import org.ktorm.support.sqlite.bulkInsertReturning
import java.time.Instant

class IllustManager(private val data: DataRepository,
                    private val bus: EventBus,
                    private val kit: IllustKit,
                    private val sourceManager: SourceDataManager,
                    private val associateManager: AssociateManager,
                    private val bookManager: BookManager,
                    private val folderManager: FolderManager,
                    private val partitionManager: PartitionManager,
                    private val trashManager: TrashManager) {

    /**
     * 从importImage批量创建新的image。
     */
    fun bulkNewImage(importImages: Collection<ImportImage>): Map<Int, Int> {
        return if(importImages.isNotEmpty()) {
            val partitionWithCount = importImages.map { it.partitionTime }.duplicateCount()
            for ((partition, count) in partitionWithCount) {
                partitionManager.addItemInPartition(partition, count)
            }

            val sourceToRowIds = importImages.mapNotNull { sourceManager.checkSourceSite(it.sourceSite, it.sourceId, it.sourcePart, it.sourcePartName) }
                .distinct()
                .let { sourceManager.bulkValidateAndCreateSourceDataIfNotExist(it) }

            val returningIds = data.db.bulkInsertReturning(Illusts, Illusts.id) {
                for (record in importImages) {
                    val newSourceDataId = if(record.sourceSite != null && record.sourceId != null) sourceToRowIds[record.sourceSite to record.sourceId] else null
                    item {
                        set(it.type, IllustModelType.IMAGE)
                        set(it.parentId, null)
                        set(it.fileId, record.fileId)
                        set(it.cachedChildrenCount, 0)
                        set(it.cachedBookCount, 0)
                        set(it.sourceDataId, newSourceDataId)
                        set(it.sourceSite, record.sourceSite)
                        set(it.sourceId, record.sourceId)
                        set(it.sourcePart, record.sourcePart)
                        set(it.sourcePartName, record.sourcePartName)
                        set(it.description, "")
                        set(it.score, null)
                        set(it.favorite, false)
                        set(it.tagme, record.tagme)
                        set(it.exportedDescription, "")
                        set(it.exportedScore, null)
                        set(it.partitionTime, record.partitionTime)
                        set(it.orderTime, record.orderTime)
                        set(it.createTime, record.createTime)
                        set(it.updateTime, record.createTime)
                    }
                }
            }

            if(returningIds.any { it == null }) {
                val nullIndexes = returningIds.mapIndexedNotNull { index, i -> if(i != null) index else null }
                throw RuntimeException("Some images insert failed. Indexes are [${nullIndexes.joinToString(", ")}]")
            }

            @Suppress("UNCHECKED_CAST")
            val ids = returningIds as List<Int>

            bus.emit(ids.map { IllustCreated(it, IllustType.IMAGE) })

            return importImages.map { it.id }.zip(ids).toMap()
        }else{
            emptyMap()
        }
    }

    /**
     * 创建新的collection。
     * @throws ResourceNotExist ("images", number[]) 给出的部分images不存在。给出不存在的image id列表
     */
    fun newCollection(illustIds: List<Int>, formDescription: String, formScore: Int?, formFavorite: Boolean?, formTagme: Illust.Tagme): Int {
        if(illustIds.isEmpty()) throw be(ParamError("images"))
        val images = unfoldImages(illustIds, sorted = false)
        val (fileId, scoreFromSub, favorite, partitionTime, orderTime) = kit.getExportedPropsFromList(images)
        val (cachedBookIds, cachedFolderIds) = kit.getCachedBookAndFolderFromImages(images)

        val createTime = Instant.now()

        val id = data.db.insertAndGenerateKey(Illusts) {
            set(it.type, IllustModelType.COLLECTION)
            set(it.parentId, null)
            set(it.fileId, fileId)
            set(it.cachedChildrenCount, images.size)
            set(it.cachedBookCount, cachedBookIds.size)
            set(it.cachedBookIds, cachedBookIds)
            set(it.cachedFolderIds, cachedFolderIds)
            set(it.sourceDataId, null)
            set(it.sourceSite, null)
            set(it.sourceId, null)
            set(it.sourcePart, null)
            set(it.sourcePartName, null)
            set(it.description, formDescription)
            set(it.score, formScore)
            set(it.favorite, formFavorite ?: favorite)
            set(it.tagme, formTagme)
            set(it.exportedDescription, formDescription)
            set(it.exportedScore, formScore ?: scoreFromSub)
            set(it.partitionTime, partitionTime)
            set(it.orderTime, orderTime)
            set(it.createTime, createTime)
            set(it.updateTime, createTime)
        } as Int

        val verifyId = data.db.from(Illusts).select(max(Illusts.id).aliased("id")).first().getInt("id")
        if(verifyId != id) {
            throw RuntimeException("Illust insert failed. generatedKey is $id but queried verify id is $verifyId.")
        }

        updateSubImages(id, images)

        if(formFavorite != null) {
            data.db.update(Illusts) {
                where { it.parentId eq id }
                set(it.favorite, formFavorite)
            }
        }

        kit.refreshAllMeta(id, copyFromChildren = true)

        bus.emit(IllustCreated(id, IllustType.COLLECTION))

        return id
    }

    /**
     * 设置一个collection的image列表。
     */
    fun updateImagesInCollection(collectionId: Int, images: List<Illust>, originScore: Int? = null) {
        val (fileId, scoreFromSub, favoriteFromSub, partitionTime, orderTime) = kit.getExportedPropsFromList(images)

        data.db.update(Illusts) {
            where { it.id eq collectionId }
            set(it.fileId, fileId)
            set(it.cachedChildrenCount, images.size)
            set(it.exportedScore, originScore ?: scoreFromSub)
            set(it.favorite, favoriteFromSub)
            set(it.partitionTime, partitionTime)
            set(it.orderTime, orderTime)
            set(it.updateTime, Instant.now())
        }

        val oldImageIds = updateSubImages(collectionId, images)

        kit.refreshAllMeta(collectionId, copyFromChildren = true)

        val added = images.map { it.id } - oldImageIds
        val deleted = (oldImageIds - images.map { it.id }.toSet()).toList()
        bus.emit(IllustImagesChanged(collectionId, added, deleted))
        added.forEach { bus.emit(IllustRelatedItemsUpdated(it, IllustType.IMAGE, collectionSot = true)) }
        deleted.forEach { bus.emit(IllustRelatedItemsUpdated(it, IllustType.IMAGE, collectionSot = true)) }
    }

    /**
     * 删除项目。对于collection，它将被直接删除；对于image，它将接trash调用，送入已删除列表。
     */
    fun delete(illust: Illust) {
        if(illust.type != IllustModelType.COLLECTION) {
            trashManager.trashImage(illust)
        }

        data.db.delete(Illusts) { it.id eq illust.id }
        data.db.delete(IllustTagRelations) { it.illustId eq illust.id }
        data.db.delete(IllustAuthorRelations) { it.illustId eq illust.id }
        data.db.delete(IllustTopicRelations) { it.illustId eq illust.id }
        data.db.delete(IllustAnnotationRelations) { it.illustId eq illust.id }

        //移除illust时，将此illust的关联组设置为空，这将同时移除所有的关联关系
        associateManager.setAssociatesOfIllust(illust.id, emptyList())

        if(illust.type != IllustModelType.COLLECTION) {
            //从所有book中移除并重导出
            bookManager.removeItemFromAllBooks(illust.id)
            //从所有folder中移除
            folderManager.removeItemFromAllFolders(illust.id)
            //关联的partition的计数-1
            partitionManager.deleteItemInPartition(illust.partitionTime)
            //对parent的导出处理
            if(illust.parentId != null) processCollectionChildrenChanged(illust.parentId, -1)

            bus.emit(IllustDeleted(illust.id, IllustType.IMAGE))
        }else{
            val children = data.db.from(Illusts).select(Illusts.id)
                .where { Illusts.parentId eq illust.id }
                .map { it[Illusts.id]!! }
            data.db.update(Illusts) {
                where { it.parentId eq illust.id }
                set(it.parentId, null)
                set(it.type, IllustModelType.IMAGE)
            }

            bus.emit(IllustDeleted(illust.id, IllustType.COLLECTION))
            children.forEach { bus.emit(IllustRelatedItemsUpdated(it, IllustType.IMAGE, collectionSot = true)) }
        }
    }

    /**
     * 复制属性。
     * @throws ResourceNotExist ("from" | "to", number) 源或目标不存在
     * @throws ResourceNotSuitable ("from" | "to", number) 源或目标类型不适用，不能使用集合
     */
    fun cloneProps(fromIllustId: Int, toIllustId: Int, props: ImagePropsCloneForm.Props, merge: Boolean, deleteFrom: Boolean) {
        val fromIllust = data.db.sequenceOf(Illusts).firstOrNull { it.id eq fromIllustId } ?: throw be(ResourceNotExist("from", fromIllustId))
        val toIllust = data.db.sequenceOf(Illusts).firstOrNull { it.id eq toIllustId } ?: throw be(ResourceNotExist("to", toIllustId))
        if(fromIllust.type == IllustModelType.COLLECTION) throw be(ResourceNotSuitable("from", fromIllustId))
        if(toIllust.type == IllustModelType.COLLECTION) throw be(ResourceNotSuitable("to", toIllustId))
        cloneProps(fromIllust, toIllust, props, merge)

        if(deleteFrom) {
            delete(fromIllust)
        }
    }

    /**
     * 复制属性。
     */
    private fun cloneProps(fromIllust: Illust, toIllust: Illust, props: ImagePropsCloneForm.Props, merge: Boolean) {
        //根据是否更改了parent，有两种不同的处理路径
        val parentChanged = props.collection && fromIllust.parentId != toIllust.parentId
        val newParent = if(parentChanged && fromIllust.parentId != null) data.db.sequenceOf(Illusts).first { (it.id eq fromIllust.parentId) and (it.type eq IllustModelType.COLLECTION) } else null
        val parentId = if(parentChanged) toIllust.parentId else fromIllust.parentId

        if(parentChanged || props.favorite || props.tagme || props.score || props.description || props.orderTime || props.partitionTime || props.source) {
            data.db.update(Illusts) {
                where { it.id eq toIllust.id }
                if(parentChanged) {
                    set(it.parentId, newParent?.id)
                    set(it.type, if(newParent != null) IllustModelType.IMAGE_WITH_PARENT else IllustModelType.IMAGE)
                    set(it.exportedScore, if(props.score) { fromIllust.score }else{ toIllust.score } ?: newParent?.score)
                    set(it.exportedDescription, if(props.description) { fromIllust.description }else{ toIllust.description }.ifEmpty { newParent?.description ?: "" })
                }
                //bug: score/description的更改仅反映在了origin属性上。这个问题先不解决了，等元数据exporter系统统一处理来解决
                if(props.favorite) set(it.favorite, fromIllust.favorite)
                if(props.tagme) set(it.tagme, if(merge) { fromIllust.tagme + toIllust.tagme }else{ fromIllust.tagme })
                if(props.score) set(it.score, fromIllust.score)
                if(props.description) set(it.description, fromIllust.description)
                if(props.orderTime) set(it.orderTime, fromIllust.orderTime)
                if(props.partitionTime && fromIllust.partitionTime != toIllust.partitionTime) {
                    set(it.partitionTime, fromIllust.partitionTime)
                    partitionManager.addItemInPartition(fromIllust.partitionTime)
                }

                if(props.source) {
                    set(it.sourceSite, fromIllust.sourceSite)
                    set(it.sourceId, fromIllust.sourceId)
                    set(it.sourcePart, fromIllust.sourcePart)
                    set(it.sourcePartName, fromIllust.sourcePartName)
                    set(it.sourceDataId, fromIllust.sourceDataId)
                }
            }
        }

        if(parentChanged) {
            //刷新新旧parent的时间&封面、导出属性
            val now = Instant.now()
            if(newParent != null) processCollectionChildrenChanged(newParent.id, 1, now)
            if(toIllust.parentId != null) processCollectionChildrenChanged(toIllust.parentId, -1, now)
        }

        if(props.metaTags) {
            val tagIds = data.db.from(IllustTagRelations).select(IllustTagRelations.tagId)
                .where { (IllustTagRelations.illustId eq fromIllust.id) and IllustTagRelations.isExported.not() }
                .map { it[IllustTagRelations.tagId]!! }
            val topicIds = data.db.from(IllustTopicRelations).select(IllustTopicRelations.topicId)
                .where { (IllustTopicRelations.illustId eq fromIllust.id) and IllustTopicRelations.isExported.not() }
                .map { it[IllustTopicRelations.topicId]!! }
            val authorIds = data.db.from(IllustAuthorRelations).select(IllustAuthorRelations.authorId)
                .where { (IllustAuthorRelations.illustId eq fromIllust.id) and IllustAuthorRelations.isExported.not() }
                .map { it[IllustAuthorRelations.authorId]!! }
            if(merge) {
                val originTagIds = data.db.from(IllustTagRelations).select(IllustTagRelations.tagId)
                    .where { (IllustTagRelations.illustId eq toIllust.id) and IllustTagRelations.isExported.not() }
                    .map { it[IllustTagRelations.tagId]!! }
                val originTopicIds = data.db.from(IllustTopicRelations).select(IllustTopicRelations.topicId)
                    .where { (IllustTopicRelations.illustId eq toIllust.id) and IllustTopicRelations.isExported.not() }
                    .map { it[IllustTopicRelations.topicId]!! }
                val originAuthorIds = data.db.from(IllustAuthorRelations).select(IllustAuthorRelations.authorId)
                    .where { (IllustAuthorRelations.illustId eq toIllust.id) and IllustAuthorRelations.isExported.not() }
                    .map { it[IllustAuthorRelations.authorId]!! }

                kit.updateMeta(toIllust.id,
                    optOf((tagIds + originTagIds).distinct()),
                    optOf((topicIds + originTopicIds).distinct()),
                    optOf((authorIds + originAuthorIds).distinct()),
                    copyFromParent = parentId)
            }else{
                kit.updateMeta(toIllust.id, optOf(tagIds), optOf(topicIds), optOf(authorIds), copyFromParent = parentId)
            }
        }

        if(props.associate) {
            associateManager.copyAssociatesFromIllust(toIllust.id, fromIllust.id)
        }

        if(props.books) {
            val books = data.db.from(BookImageRelations)
                .select(BookImageRelations.bookId, BookImageRelations.ordinal)
                .where { BookImageRelations.imageId eq fromIllust.id }
                .map { Pair(it[BookImageRelations.bookId]!!, it[BookImageRelations.ordinal]!! + 1 /* +1 使新项插入到旧项后面 */) }

            if(merge) {
                val existsBooks = data.db.from(BookImageRelations)
                    .select(BookImageRelations.bookId)
                    .where { BookImageRelations.imageId eq toIllust.id }
                    .map { it[BookImageRelations.bookId]!! }
                    .toSet()

                val newBooks = books.filter { (id, _) -> id !in existsBooks }
                if(newBooks.isNotEmpty()) bookManager.addItemInBooks(toIllust.id, newBooks)
            }else{
                bookManager.removeItemFromAllBooks(toIllust.id)
                bookManager.addItemInBooks(toIllust.id, books)
            }

        }

        if(props.folders) {
            val folders = data.db.from(FolderImageRelations)
                .select(FolderImageRelations.folderId, FolderImageRelations.ordinal)
                .where { FolderImageRelations.imageId eq fromIllust.id }
                .map { Pair(it[FolderImageRelations.folderId]!!, it[FolderImageRelations.ordinal]!! + 1 /* +1 使新项插入到旧项后面 */) }

            if(merge) {
                val existsFolders = data.db.from(FolderImageRelations)
                    .select(FolderImageRelations.folderId)
                    .where { FolderImageRelations.imageId eq toIllust.id }
                    .map { it[FolderImageRelations.folderId]!! }
                    .toSet()

                val newFolders = folders.filter { (id, _) -> id !in existsFolders }
                if(newFolders.isNotEmpty()) folderManager.addItemInFolders(toIllust.id, newFolders)
            }else{
                folderManager.removeItemFromAllFolders(toIllust.id)
                folderManager.addItemInFolders(toIllust.id, folders)
            }
        }

        val listUpdated = parentChanged || props.favorite || props.score || props.orderTime || props.source
        val detailUpdated = props.favorite || props.score || props.orderTime || props.description || props.partitionTime || props.metaTags
        if(listUpdated || detailUpdated) {
            bus.emit(IllustUpdated(toIllust.id, toIllust.type.toIllustType(),
                listUpdated = listUpdated,
                detailUpdated = detailUpdated,
                metaTagSot = props.metaTags,
                descriptionSot = props.description,
                scoreSot = props.score,
                favoriteSot = props.favorite,
                timeSot = props.orderTime || props.partitionTime
            ))
        }
        if(props.associate || props.books || props.folders || parentChanged) {
            bus.emit(IllustRelatedItemsUpdated(toIllust.id, toIllust.type.toIllustType(), associateSot = props.associate, bookUpdated = props.books, folderUpdated = props.folders, collectionSot = parentChanged))
        }
        if(props.source) {
            bus.emit(IllustSourceDataUpdated(toIllust.id))
        }
        if(parentChanged) {
            if(newParent != null) bus.emit(IllustImagesChanged(newParent.id, listOf(toIllust.id), emptyList()))
            if(toIllust.parentId != null) bus.emit(IllustImagesChanged(toIllust.parentId, emptyList(), listOf(toIllust.id)))
        }
    }

    /**
     * 应用images列表，设置images的parent为当前collection，同时处理重导出关系。
     * 对于移入/移除当前集合的项，对其属性进行重导出；对于被移出的旧parent，也对其进行处理。
     * @return oldImageIds
     */
    private fun updateSubImages(collectionId: Int, images: List<Illust>): Set<Int> {
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

        //处理移入项，修改它们的type/parentId，并视情况执行重新导出
        val addIds = imageIds - oldImageIds
        data.db.update(Illusts) {
            where { it.id inList addIds }
            set(it.parentId, collectionId)
            set(it.type, IllustModelType.IMAGE_WITH_PARENT)
        }
        //这些image有旧的parent，需要对旧parent做重新导出
        val now = Instant.now()
        images.asSequence()
            .filter { it.id in addIds && it.parentId != null && it.parentId != collectionId }
            .groupBy { it.parentId!! }
            .forEach { (parentId, images) ->
                processCollectionChildrenChanged(parentId, -images.size, now)
                bus.emit(IllustImagesChanged(parentId, emptyList(), images.map { it.id }))
            }
        //这些image的collection发生变化，发送事件
        addIds.forEach { bus.emit(IllustRelatedItemsUpdated(it, IllustType.IMAGE, collectionSot = true)) }
        deleteIds.forEach { bus.emit(IllustRelatedItemsUpdated(it, IllustType.IMAGE, collectionSot = true)) }

        return oldImageIds
    }

    /**
     * 由于向collection加入或删除了项，因此需要处理所有属性的重导出，包括firstCover, count, partitionTime, orderTime, updateTime。
     * 这个函数是在变化已经发生后，处理关系使用的，而且必须同步处理。
     */
    fun processCollectionChildrenChanged(collectionId: Int, changedCount: Int, updateTime: Instant? = null) {
        val children = data.db.from(Illusts)
            .select(Illusts.fileId, Illusts.partitionTime, Illusts.orderTime, Illusts.favorite)
            .where { Illusts.parentId eq collectionId }
            .map { Tuple4(it[Illusts.fileId]!!, it[Illusts.partitionTime]!!, it[Illusts.orderTime]!!, it[Illusts.favorite]!!) }

        if(children.isNotEmpty()) {
            val fileId = children.minBy { it.f3 }.f1
            val partitionTime = children.asSequence().map { it.f2 }.groupBy { it }.maxBy { it.value.size }.key
            val orderTime = children.filter { it.f2 == partitionTime }.minOf { it.f3 }
            val favorite = children.any { it.f4 }

            data.db.update(Illusts) {
                where { it.id eq collectionId }
                set(it.fileId, fileId)
                set(it.favorite, favorite)
                set(it.partitionTime, partitionTime)
                set(it.orderTime, orderTime)
                set(it.cachedChildrenCount, it.cachedChildrenCount plus changedCount)
                set(it.updateTime, updateTime ?: Instant.now())
            }
        }else{
            //此collection已经没有项了，将其删除
            data.db.delete(Illusts) { it.id eq collectionId }
            data.db.delete(IllustTagRelations) { it.illustId eq collectionId }
            data.db.delete(IllustAuthorRelations) { it.illustId eq collectionId }
            data.db.delete(IllustTopicRelations) { it.illustId eq collectionId }
            data.db.delete(IllustAnnotationRelations) { it.illustId eq collectionId }

            bus.emit(IllustDeleted(collectionId, IllustType.COLLECTION))
        }
    }

    /**
     * 将一个images id序列映射成illust列表。其中的collection会被展开成其children列表，并去重。
     * @param sorted 返回结果保持有序。默认开启。对book是有必要的，但collection就没有这个需要。控制这个开关来做查询效率优化。
     */
    fun unfoldImages(illustIds: List<Int>, paramNameWhenThrow: String = "images", sorted: Boolean = true): List<Illust> {
        val result = data.db.sequenceOf(Illusts).filter { it.id inList illustIds }.toList()
        //数量不够表示有imageId不存在
        if(result.size < illustIds.size) throw be(ResourceNotExist(paramNameWhenThrow, illustIds.toSet() - result.asSequence().map { it.id }.toSet()))

        if(sorted) {
            //有序时不能做太多优化，就把原id列表依次展开查询
            val resultMap = result.associateBy { it.id }
            return illustIds.asSequence().map { id -> resultMap[id]!! }.flatMap { illust ->
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