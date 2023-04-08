package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.backend.exporter.BackendExporter
import com.heerkirov.hedge.server.components.backend.exporter.IllustMetadataExporterTask
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.form.ImagePropsCloneForm
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.events.IllustDeleted
import com.heerkirov.hedge.server.events.IllustUpdated
import com.heerkirov.hedge.server.exceptions.ResourceNotExist
import com.heerkirov.hedge.server.exceptions.ResourceNotSuitable
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.functions.kit.IllustKit
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.utils.DateTime
import com.heerkirov.hedge.server.utils.types.optOf
import org.ktorm.dsl.*
import org.ktorm.entity.first
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf

class IllustExtendManager(private val data: DataRepository,
                          private val bus: EventBus,
                          private val kit: IllustKit,
                          private val illustManager: IllustManager,
                          private val associateManager: AssociateManager,
                          private val bookManager: BookManager,
                          private val folderManager: FolderManager,
                          private val partitionManager: PartitionManager,
                          private val fileManager: FileManager,
                          private val backendExporter: BackendExporter) {

    /**
     * 删除项目。
     */
    fun delete(illust: Illust) {
        val anyNotExportedMetaExists = kit.anyNotExportedMetaExists(illust.id)

        data.db.delete(Illusts) { it.id eq illust.id }
        data.db.delete(IllustTagRelations) { it.illustId eq illust.id }
        data.db.delete(IllustAuthorRelations) { it.illustId eq illust.id }
        data.db.delete(IllustTopicRelations) { it.illustId eq illust.id }
        data.db.delete(IllustAnnotationRelations) { it.illustId eq illust.id }

        //移除illust时，将此illust的关联组设置为空，这将同时移除所有的关联关系
        associateManager.setAssociatesOfIllust(illust.id, emptyList())

        if(illust.type != IllustModelType.COLLECTION) {
            //从所有book中移除并重导出
            bookManager.removeItemFromAllBooks(illust.id, exportMetaTags = anyNotExportedMetaExists)
            //从所有folder中移除
            folderManager.removeItemFromAllFolders(illust.id)
            //关联的partition的计数-1
            partitionManager.deleteItemInPartition(illust.partitionTime)
            //对parent的导出处理
            if(illust.parentId != null) illustManager.processCollectionChildrenRemoved(illust.parentId, listOf(illust))

            //删除关联的file
            fileManager.deleteFile(illust.fileId)

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
            //对children做重导出
            backendExporter.add(children.map { IllustMetadataExporterTask(it,
                exportDescription = illust.description.isNotEmpty(),
                exportScore = illust.score != null,
                exportMetaTag = anyNotExportedMetaExists) })

            bus.emit(IllustDeleted(illust.id, IllustType.COLLECTION))
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
                    set(it.sourceDataId, fromIllust.sourceDataId)
                }
            }
        }

        if(parentChanged) {
            //刷新新旧parent的时间&封面、导出属性 (metaTag不包含在其中，它稍后处理)
            val now = DateTime.now()
            if(newParent != null) illustManager.processCollectionChildrenAdded(newParent.id, toIllust, now, exportScore = true)
            if(toIllust.parentId != null) illustManager.processCollectionChildrenRemoved(toIllust.parentId, listOf(toIllust), now, exportScore = true)
        }else{
            //刷新parent的导出属性，适时刷新封面&时间 (metaTag不包含在其中，它稍后处理)
            if(toIllust.parentId != null) {
                val exportScore = props.score
                val exportMeta = !kit.anyNotExportedMetaExists(toIllust.parentId)
                val exportFirstCover = (props.orderTime || props.partitionTime) && kit.getFirstChildOfCollection(toIllust.parentId).id == toIllust.id
                if(exportScore || exportMeta || exportFirstCover) {
                    backendExporter.add(IllustMetadataExporterTask(toIllust.parentId, exportScore = exportScore, exportMetaTag = exportMeta, exportFirstCover = exportFirstCover))
                }
            }
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

            if(parentChanged) {
                //如果复制了parent，那么需要处理新旧parent的重导出
                if(newParent != null) backendExporter.add(IllustMetadataExporterTask(newParent.id, exportMetaTag = true))
                if(toIllust.parentId != null) backendExporter.add(IllustMetadataExporterTask(toIllust.parentId, exportMetaTag = true))
            }else if(toIllust.parentId != null && !kit.anyNotExportedMetaExists(toIllust.parentId)) {
                //如果没有复制，那么当parent没有任何not exported meta时，处理parent的重导出
                backendExporter.add(IllustMetadataExporterTask(toIllust.parentId, exportMetaTag = true))
            }
        }else if(parentChanged) {
            //即使没有选择复制metaTags，但是如果选择复制了parent，那么也仍然需要处理新旧parent的重导出
            //尽管这可以作为processCollection的一部分，但为了代码清晰起见把它们分开了
            if(kit.anyNotExportedMetaExists(toIllust.id)) {
                //只有当toIllust包含not exported meta时，才有必要处理parent的重导出
                if(newParent != null) backendExporter.add(IllustMetadataExporterTask(newParent.id, exportMetaTag = true))
                if(toIllust.parentId != null) backendExporter.add(IllustMetadataExporterTask(toIllust.parentId, exportMetaTag = true))
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
                if(newBooks.isNotEmpty()) bookManager.addItemInBooks(toIllust.id, newBooks, exportMetaTags = true)
            }else{
                bookManager.removeItemFromAllBooks(toIllust.id, exportMetaTags = true)
                bookManager.addItemInBooks(toIllust.id, books, exportMetaTags = true)
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

        bus.emit(IllustUpdated(toIllust.id, toIllust.type.toIllustType(),
            generalUpdated = true,
            metaTagUpdated = true,
            sourceDataUpdated = true,
            relatedItemsUpdated = true
        ))
    }
}