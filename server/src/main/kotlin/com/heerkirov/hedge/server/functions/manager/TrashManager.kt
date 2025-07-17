package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.backend.exporter.BackendExporter
import com.heerkirov.hedge.server.components.backend.exporter.IllustMetadataExporterTask
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.enums.ExportType
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.events.IllustCreated
import com.heerkirov.hedge.server.events.TrashedImageCreated
import com.heerkirov.hedge.server.events.TrashedImageProcessed
import com.heerkirov.hedge.server.functions.kit.IllustKit
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.model.TrashedImage
import com.heerkirov.hedge.server.utils.types.optOf
import org.ktorm.dsl.*
import org.ktorm.entity.filter
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import java.time.Instant

class TrashManager(private val data: DataRepository,
                   private val bus: EventBus,
                   private val backendExporter: BackendExporter,
                   private val illustKit: IllustKit,
                   private val fileManager: FileManager,
                   private val bookManager: BookManager,
                   private val folderManager: FolderManager,
                   private val associateManager: AssociateManager,
                   private val sourceManager: SourceDataManager) {
    /**
     * 将一个指定的图像移入“已删除”。
     * 移入之后，此图像的元数据和关系会被一同保存下来。
     */
    fun trashImage(illust: Illust) {
        val topics = data.db.from(IllustTopicRelations)
            .select(IllustTopicRelations.topicId)
            .where { (IllustTopicRelations.illustId eq illust.id) and (IllustTopicRelations.isExported eq ExportType.NO) }
            .map { it[IllustTopicRelations.topicId]!! }

        val authors = data.db.from(IllustAuthorRelations)
            .select(IllustAuthorRelations.authorId)
            .where { (IllustAuthorRelations.illustId eq illust.id) and (IllustAuthorRelations.isExported eq ExportType.NO) }
            .map { it[IllustAuthorRelations.authorId]!! }

        val tags = data.db.from(IllustTagRelations)
            .select(IllustTagRelations.tagId)
            .where { (IllustTagRelations.illustId eq illust.id) and (IllustTagRelations.isExported eq ExportType.NO) }
            .map { it[IllustTagRelations.tagId]!! }

        val books = data.db.from(BookImageRelations)
            .select(BookImageRelations.bookId)
            .where { BookImageRelations.imageId eq illust.id }
            .map { it[BookImageRelations.bookId]!! }

        val folders = data.db.from(FolderImageRelations)
            .select(FolderImageRelations.folderId)
            .where { FolderImageRelations.imageId eq illust.id }
            .map { it[FolderImageRelations.folderId]!! }

        val associates = data.db.from(AssociateRelations)
            .select(AssociateRelations.relatedIllustId)
            .where { AssociateRelations.illustId eq illust.id }
            .map { it[AssociateRelations.relatedIllustId]!! }

        val metadata = TrashedImage.Metadata(tags, topics, authors, books, folders, associates)
        val trashedTime = Instant.now()

        data.db.insert(TrashedImages) {
            set(it.imageId, illust.id)
            set(it.parentId, illust.parentId)
            set(it.fileId, illust.fileId)
            set(it.sourceSite, illust.sourceSite)
            set(it.sourceId, illust.sourceId)
            set(it.sourcePart, illust.sourcePart)
            set(it.sourcePartName, illust.sourcePartName)
            set(it.partitionTime, illust.partitionTime)
            set(it.createTime, illust.createTime)
            set(it.updateTime, illust.updateTime)
            set(it.orderTime, illust.orderTime)
            set(it.description, illust.description)
            set(it.tagme, illust.tagme)
            set(it.score, illust.score)
            set(it.favorite, illust.favorite)
            set(it.metadata, metadata)
            set(it.trashedTime, trashedTime)
        }

        bus.emit(TrashedImageCreated(illust.id))
    }

    /**
     * 将已删除的图像彻底删除。此时，会同步删除File。
     */
    fun deleteTrashedImage(imageIds: List<Int>) {
        if(imageIds.isNotEmpty()) {
            data.db.from(TrashedImages)
                .select(TrashedImages.fileId)
                .where { TrashedImages.imageId inList imageIds }
                .map { it[TrashedImages.fileId]!! }
                .forEach { fileManager.deleteFile(it) }

            data.db.delete(TrashedImages) { it.imageId inList imageIds }

            bus.emit(TrashedImageProcessed(imageIds, false))
        }
    }

    /**
     * 将已删除的图像恢复至原位。
     */
    fun restoreTrashedImage(imageIds: List<Int>) {
        if(imageIds.isNotEmpty()) {
            val items = data.db.sequenceOf(TrashedImages).filter { it.imageId inList imageIds }

            val backendExportCollections = mutableSetOf<Int>()
            val addToBooks = mutableMapOf<Int, MutableList<Int>>()
            val addToFolders = mutableMapOf<Int, MutableList<Int>>()

            for (item in items) {
                val collection = if(item.parentId == null) null else {
                    data.db.sequenceOf(Illusts).firstOrNull { (Illusts.type eq IllustModelType.COLLECTION) and (Illusts.id eq item.parentId) }
                }

                val newSourceDataId = sourceManager.checkSourceSite(item.sourceSite, item.sourceId, item.sourcePart, item.sourcePartName)
                    ?.let { (source, sourceId) -> sourceManager.validateAndCreateSourceDataIfNotExist(source, sourceId) }

                val exportedDescription = if(item.description.isEmpty() && collection != null) collection.exportedDescription else item.description
                val exportedScore = if(item.score == null && collection != null) collection.exportedScore else item.score

                data.db.insert(Illusts) {
                    set(it.id, item.imageId)
                    set(it.type, if(collection != null) IllustModelType.IMAGE_WITH_PARENT else IllustModelType.IMAGE)
                    set(it.parentId, item.parentId)
                    set(it.fileId, item.fileId)
                    set(it.cachedChildrenCount, 0)
                    set(it.cachedBookCount, 0)
                    set(it.sourceDataId, newSourceDataId)
                    set(it.sourceSite, item.sourceSite)
                    set(it.sourceId, item.sourceId)
                    set(it.sortableSourceId, item.sourceId?.toLongOrNull())
                    set(it.sourcePart, item.sourcePart)
                    set(it.sourcePartName, item.sourcePartName)
                    set(it.description, item.description)
                    set(it.score, item.score)
                    set(it.favorite, item.favorite)
                    set(it.tagme, item.tagme)
                    set(it.exportedDescription, exportedDescription)
                    set(it.exportedScore, exportedScore)
                    set(it.partitionTime, item.partitionTime)
                    set(it.orderTime, item.orderTime)
                    set(it.createTime, item.createTime)
                    set(it.updateTime, item.updateTime)
                }

                associateManager.setAssociatesOfIllust(item.imageId, item.metadata.associates)

                item.metadata.books.forEach { bookId -> addToBooks.computeIfAbsent(bookId) { mutableListOf() }.add(item.imageId) }
                item.metadata.folders.forEach { folderId -> addToFolders.computeIfAbsent(folderId) { mutableListOf() }.add(item.imageId) }

                //对tag进行校验和分析，导出
                illustKit.updateMeta(item.imageId,
                    newTags = optOf(item.metadata.tags), newTopics = optOf(item.metadata.topics), newAuthors = optOf(item.metadata.authors),
                    creating = true, copyFromParent = collection?.id, ignoreNotExist = true)

                if(collection != null) {
                    //对parent做重导出。尽管重导出有多个可分离的部分，但分开判定太费劲且收益不高，就统一只要有parent就重导出了
                    backendExportCollections.add(collection.id)
                }
            }

            addToBooks.forEach { (bookId, imageIds) ->
                val exist = data.db.from(Books).select((count(Books.id) greater 0).aliased("exist")).where { Books.id eq bookId }.map { it.getBoolean("exist") }.first()
                if(exist) bookManager.addImagesInBook(bookId, imageIds, null)
            }
            addToFolders.forEach { (folderId, imageIds) ->
                val exist = data.db.from(Folders).select((count(Folders.id) greater 0).aliased("exist")).where { Folders.id eq folderId }.map { it.getBoolean("exist") }.first()
                if(exist) folderManager.addImagesInFolder(folderId, imageIds, null)
            }

            data.db.delete(TrashedImages) { it.imageId inList imageIds }

            bus.emit(TrashedImageProcessed(imageIds, true))
            imageIds.forEach { bus.emit(IllustCreated(it, IllustType.IMAGE)) }
            //手动发送Exporter任务。IllustCreated事件不会触发有关它的parent的变更，也没有其他的事件，因此需要手动处理。
            backendExportCollections.forEach { backendExporter.add(IllustMetadataExporterTask(it, exportFirstCover = true, exportMetaTag = true, exportScore = true)) }
        }
    }
}