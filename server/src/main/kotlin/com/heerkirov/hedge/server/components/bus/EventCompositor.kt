package com.heerkirov.hedge.server.components.bus

import com.heerkirov.hedge.server.components.backend.exporter.*
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.enums.MetaType
import com.heerkirov.hedge.server.events.*
import com.heerkirov.hedge.server.library.framework.Component
import org.ktorm.dsl.*

/**
 * 事件合成器。
 * 插入在事件总线之中，用于从已有的事件合成更多事件。
 */
interface EventCompositor : Component

class EventCompositorImpl(private val data: DataRepository,
                          private val bus: EventBus,
                          private val backendExporter: BackendExporter) : EventCompositor {
    init {
        bus.onImmediate(::composite)
        bus.on(::export)
    }

    private fun composite(itemBusEvent: ItemBusEvent<*>) {
        val (e, _) = itemBusEvent
        when(e) {
            is SourceDataCreated -> {
                //source data变化时，发送illust source data的更新事件
                sendSourceDataUpdatedEvent(e.sourceDataId)
            }
            is SourceDataUpdated -> {
                //source data变化时，发送illust source data的更新事件
                sendSourceDataUpdatedEvent(e.sourceDataId)
            }
            is IllustRelatedItemsUpdated -> {
                if(e.associateSot) {
                    //associate变化时，向同组的项发送related items的更新事件
                    sendAssociateUpdatedEvent(e.illustId)
                }
            }
            is ImportUpdated, is ImportDeleted,
            is SimilarFinderResultCreated, is SimilarFinderResultDeleted -> {
                //find similar数量变化、import删除、import状态变更时，发送homepage state的更新事件
                sendHomepageStateChangedEvent()
            }
            is StagingPostChanged -> {
                if(e.added.isNotEmpty() || e.deleted.isNotEmpty()) {
                    //staging post数量变化时，发送homepage state的更新事件
                    sendHomepageStateChangedEvent()
                }
            }
        }
    }

    private fun export(events: PackagedBusEvent) {
        events.which {
            each<MetaTagUpdated> { e ->
                if(e.metaType == MetaType.TAG && e.parentSot) {
                    //tag的parent发生变化时，重新导出global tag ordinal
                    exportTagGlobal()
                }
            }
            each<MetaTagCreated> { e ->
                if(e.metaType == MetaType.TAG) {
                    //tag新建时，重新导出global tag ordinal
                    exportTagGlobal()
                }
            }
            each<IllustRelatedItemsUpdated>({ e -> e.illustType == IllustType.IMAGE }) { e ->
                if(e.bookUpdated) {
                    //关联的book有更新时，重新导出book与image的有关信息，主要是book-member标记和collection-book关系
                    exportImageBookRelation(e.illustId)
                }
                if(e.folderUpdated) {
                    //关联的folder有更新时，重新导出folder与image的有关信息，主要是collection-book关系
                    exportImageFolderRelation(e.illustId)
                }
                if(e.collectionSot) {
                    //关联的collection有更新时，重新导出metadata
                    exportImageMetadata(e.illustId)
                }
            }
            each<IllustImagesChanged> { e ->
                if(e.added.isNotEmpty() || e.deleted.isNotEmpty()) {
                    //collection的children发生变化时，重新导出collection的相关属性
                    exportCollectionMetadata(e.illustId)
                    //重新导出book/folder与image的有关信息
                    exportImageBookRelation(e.illustId)
                    exportImageFolderRelation(e.illustId)
                }
            }
            each<BookImagesChanged> { e ->
                if(e.added.isNotEmpty() || e.deleted.isNotEmpty()) {
                    //book的children发生变化时，重新导出book的meta tag
                    exportBookMetadata(e.bookId)
                }
            }
            all/*<IllustUpdated>*/({ e -> e.illustType == IllustType.COLLECTION && (e.metaTagSot || e.scoreSot || e.descriptionSot) }) { events ->
                //collection的相关属性变化时，重新导出其children的属性
                exportImageMetadataOfCollection(events)
            }
            all/*<IllustUpdated>*/({ e -> e.illustType == IllustType.IMAGE && (e.metaTagSot || e.scoreSot || e.timeSot || e.favoriteSot || e.tagmeSot) }) { events ->
                //image相关属性变化时，重新导出其parent的属性
                exportCollectionMetadataOfImages(events)
            }
            all<IllustUpdated>({ e -> e.illustType == IllustType.IMAGE && e.metaTagSot }) { events ->
                //image的metaTag变化时，重新导出相关book的属性
                exportBookMetadataOfImages(events.map { it.illustId })
            }

        }
    }

    private fun sendSourceDataUpdatedEvent(sourceDataId: Int) {
        val illustIds = data.db.from(Illusts).select(Illusts.id).where { (Illusts.type notEq IllustModelType.COLLECTION) and (Illusts.sourceDataId eq sourceDataId) }.map { it[Illusts.id]!! }
        illustIds.forEach { bus.emit(IllustSourceDataUpdated(it, IllustType.IMAGE)) }
    }

    private fun sendAssociateUpdatedEvent(illustId: Int) {
        val associates = data.db.from(AssociateRelations)
            .innerJoin(Illusts, Illusts.id eq AssociateRelations.relatedIllustId)
            .select(AssociateRelations.relatedIllustId, Illusts.type)
            .where { AssociateRelations.illustId eq illustId }
            .map { it[AssociateRelations.relatedIllustId]!! to it[Illusts.type]!! }
        associates.forEach { (id, type) -> bus.emit(IllustRelatedItemsUpdated(id, type.toIllustType())) }
    }

    private fun sendHomepageStateChangedEvent() {
        bus.emit(HomepageStateChanged)
    }

    private fun exportTagGlobal() {
        backendExporter.add(TagGlobalSortExporterTask)
    }

    private fun exportImageBookRelation(imageId: Int) {
        backendExporter.add(IllustBookRelationExporterTask(imageIds = listOf(imageId)))
    }

    private fun exportImageFolderRelation(imageId: Int) {
        backendExporter.add(IllustFolderRelationExporterTask(imageIds = listOf(imageId)))
    }

    private fun exportBookMetadata(bookId: Int) {
        backendExporter.add(BookMetadataExporterTask(bookId, exportMetaTag = true))
    }

    private fun exportImageMetadata(imageId: Int) {
        backendExporter.add(IllustMetadataExporterTask(imageId, exportScore = true, exportMetaTag = true, exportDescription = true))
    }

    private fun exportCollectionMetadata(collectionId: Int) {
        backendExporter.add(IllustMetadataExporterTask(collectionId, exportScore = true, exportMetaTag = true, exportFavorite = true, exportTagme = true, exportFirstCover = true))
    }

    private fun exportImageMetadataOfCollection(events: Collection<IllustUpdated>) {
        val collectionIds = events.map { it.illustId }
        val eventsMap = events.associateBy { it.illustId }
        val result = data.db.from(Illusts)
            .select(Illusts.parentId, Illusts.id)
            .where { Illusts.type eq IllustModelType.IMAGE_WITH_PARENT and (Illusts.parentId inList collectionIds) }
            .map { it[Illusts.parentId]!! to it[Illusts.id]!! }
            .groupBy({ it.first }) { it.second }
        for ((parentId, children) in result) {
            eventsMap[parentId]?.let {
                for (child in children) {
                    backendExporter.add(IllustMetadataExporterTask(child, exportScore = it.scoreSot, exportMetaTag = it.metaTagSot, exportDescription = it.descriptionSot))
                }
            }
        }
    }

    private fun exportCollectionMetadataOfImages(events: Collection<IllustUpdated>) {
        val imageIds = events.map { it.illustId }
        val eventsMap = events.associateBy { it.illustId }
        val parentIds = data.db.from(Illusts)
            .select(Illusts.parentId, Illusts.id)
            .where { Illusts.type eq IllustModelType.IMAGE_WITH_PARENT and (Illusts.id inList imageIds) }
            .map { it[Illusts.parentId]!! to it[Illusts.id]!! }
            .groupBy({ it.first }) { eventsMap[it.second] }
        for ((parentId, related) in parentIds) {
            val exportMetaTag = related.any { it?.metaTagSot ?: false }
            val exportScore = related.any { it?.scoreSot ?: false }
            val exportFirstCover = related.any { it?.timeSot ?: false }
            val exportFavorite = related.any { it?.favoriteSot ?: false }
            val exportTagme = related.any { it?.tagmeSot ?: false }
            backendExporter.add(IllustMetadataExporterTask(parentId, exportScore = exportScore, exportMetaTag = exportMetaTag, exportFavorite = exportFavorite, exportTagme = exportTagme, exportFirstCover = exportFirstCover))
        }
    }

    private fun exportBookMetadataOfImages(imageIds: List<Int>) {
        val bookIds = data.db.from(Books)
            .innerJoin(BookImageRelations, BookImageRelations.bookId eq Books.id)
            .select(Books.id)
            .where { BookImageRelations.imageId inList imageIds }
            .map { it[Books.id]!! }
            .distinct()
        for (bookId in bookIds) {
            backendExporter.add(BookMetadataExporterTask(bookId, exportMetaTag = true))
        }
    }
}