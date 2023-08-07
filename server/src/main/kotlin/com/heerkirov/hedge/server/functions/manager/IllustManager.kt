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
import com.heerkirov.hedge.server.utils.DateTime
import com.heerkirov.hedge.server.utils.filterInto
import com.heerkirov.hedge.server.utils.ktorm.asSequence
import com.heerkirov.hedge.server.utils.types.optOf
import com.heerkirov.hedge.server.utils.types.undefined
import org.ktorm.dsl.*
import org.ktorm.entity.*
import java.time.LocalDate
import java.time.LocalDateTime

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
     * 创建新的image。
     * @throws ResourceNotExist ("site", string) 给出的site不存在
     * @throws ResourceNotExist ("parentId", number) 给定的parent不存在，或者它不是一个collection。给出id
     * @throws ResourceNotExist ("topics", number[]) 部分topics资源不存在。给出不存在的topic id列表
     * @throws ResourceNotExist ("authors", number[]) 部分authors资源不存在。给出不存在的author id列表
     * @throws ResourceNotExist ("tags", number[]) 部分tags资源不存在。给出不存在的tag id列表
     * @throws ResourceNotSuitable ("tags", number[]) 部分tags资源不适用。地址段不适用于此项。给出不适用的tag id列表
     * @throws ConflictingGroupMembersError 发现标签冲突组
     */
    fun newImage(fileId: Int, sourceSite: String? = null, sourceId: Long? = null, sourcePart: Int? = null, sourcePartName: String? = null,
                 description: String = "", score: Int? = null, favorite: Boolean = false, tagme: Illust.Tagme = Illust.Tagme.EMPTY,
                 partitionTime: LocalDate, orderTime: Long, createTime: LocalDateTime): Int {
        partitionManager.addItemInPartition(partitionTime)

        val newSourceDataId = sourceManager.checkSourceSite(sourceSite, sourceId, sourcePart, sourcePartName)
            ?.let { (source, sourceId) -> sourceManager.validateAndCreateSourceDataIfNotExist(source, sourceId) }

        val id = data.db.insertAndGenerateKey(Illusts) {
            set(it.type, IllustModelType.IMAGE)
            set(it.parentId, null)
            set(it.fileId, fileId)
            set(it.cachedChildrenCount, 0)
            set(it.cachedBookCount, 0)
            set(it.sourceDataId, newSourceDataId)
            set(it.sourceSite, sourceSite)
            set(it.sourceId, sourceId)
            set(it.sourcePart, sourcePart)
            set(it.sourcePartName, sourcePartName)
            set(it.description, description)
            set(it.score, score)
            set(it.favorite, favorite)
            set(it.tagme, tagme)
            set(it.exportedDescription, description)
            set(it.exportedScore, score)
            set(it.partitionTime, partitionTime)
            set(it.orderTime, orderTime)
            set(it.createTime, createTime)
            set(it.updateTime, createTime)
        } as Int

        //对tag进行校验和分析，导出
        kit.updateMeta(id, creating = true, newTags = undefined(), newTopics = undefined(), newAuthors = undefined())

        bus.emit(IllustCreated(id, IllustType.IMAGE))

        return id
    }

    /**
     * 创建新的collection。
     * @throws ResourceNotExist ("images", number[]) 给出的部分images不存在。给出不存在的image id列表
     */
    fun newCollection(illustIds: List<Int>, formDescription: String, formScore: Int?, formFavorite: Boolean, formTagme: Illust.Tagme): Int {
        if(illustIds.isEmpty()) throw be(ParamError("images"))
        val images = unfoldImages(illustIds, sorted = false)
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
            set(it.sourcePartName, null)
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

    /**
     * 设置一个collection的image列表。
     */
    fun updateImagesInCollection(collectionId: Int, images: List<Illust>, score: Int? = null) {
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
            if(illust.parentId != null) processCollectionChildrenRemoved(illust.parentId, listOf(illust))

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
            val now = DateTime.now()
            if(newParent != null) processCollectionChildrenAdded(newParent.id, toIllust, now)
            if(toIllust.parentId != null) processCollectionChildrenRemoved(toIllust.parentId, listOf(toIllust), now)
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
        val now = DateTime.now()
        images.asSequence()
            .filter { it.id in addIds && it.parentId != null && it.parentId != collectionId }
            .groupBy { it.parentId!! }
            .forEach { (parentId, images) ->
                processCollectionChildrenRemoved(parentId, images, now)
                bus.emit(IllustImagesChanged(parentId, emptyList(), images.map { it.id }))
            }
        //这些image的collection发生变化，发送事件
        addIds.forEach { bus.emit(IllustRelatedItemsUpdated(it, IllustType.IMAGE, collectionSot = true)) }
        deleteIds.forEach { bus.emit(IllustRelatedItemsUpdated(it, IllustType.IMAGE, collectionSot = true)) }

        return oldImageIds
    }

    /**
     * 由于向collection加入了新的child，因此需要处理所有属性的重导出，包括firstCover, count, score, metaTags。
     * 这个函数不是向collection加入child，而是已经加入了，为此需要处理关系，而且必须同步处理。
     */
    fun processCollectionChildrenAdded(collectionId: Int, addedImage: Illust, updateTime: LocalDateTime? = null) {
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

    }

    /**
     * 由于从collection移除了child，因此需要处理所有属性的重导出，包括firstCover, count, score, metaTags。若已净空，则会直接移除collection。
     * 这个函数不是从collection移除child，而是已经移除了，为此需要处理关系，而且必须同步处理。
     */
    fun processCollectionChildrenRemoved(collectionId: Int, removedImages: List<Illust>, updateTime: LocalDateTime? = null) {
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