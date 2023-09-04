package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.FolderImageRelations
import com.heerkirov.hedge.server.dao.Folders
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.events.FolderImagesChanged
import com.heerkirov.hedge.server.events.IllustRelatedItemsUpdated
import com.heerkirov.hedge.server.functions.kit.FolderKit
import org.ktorm.dsl.*
import org.ktorm.entity.filter
import org.ktorm.entity.sequenceOf
import org.ktorm.entity.toList
import java.time.Instant

class FolderManager(private val data: DataRepository, private val bus: EventBus, private val kit: FolderKit) {
    /**
     * 向folder追加新的images。
     */
    fun addImagesInFolder(folderId: Int, imageIds: List<Int>, ordinal: Int?) {
        val imageCount = kit.upsertSubImages(folderId, imageIds, ordinal)
        data.db.update(Folders) {
            where { it.id eq folderId }
            set(it.cachedCount, imageCount)
            set(it.updateTime, Instant.now())
        }

        bus.emit(FolderImagesChanged(folderId, imageIds, emptyList(), emptyList()))
        imageIds.forEach { bus.emit(IllustRelatedItemsUpdated(it, IllustType.IMAGE, folderUpdated = true)) }
    }

    /**
     * 移动images.
     */
    fun moveImagesInFolder(folderId: Int, imageIds: List<Int>, ordinal: Int?) {
        kit.moveSubImages(folderId, imageIds, ordinal)
        data.db.update(Folders) {
            where { it.id eq folderId }
            set(it.updateTime, Instant.now())
        }

        bus.emit(FolderImagesChanged(folderId, emptyList(), imageIds, emptyList()))
    }

    /**
     * 从folder移除images。
     */
    fun removeImagesFromFolder(folderId: Int, imageIds: List<Int>) {
        val imageCount = kit.deleteSubImages(folderId, imageIds)
        data.db.update(Folders) {
            where { it.id eq folderId }
            if(imageCount != null) set(it.cachedCount, imageCount)
            set(it.updateTime, Instant.now())
        }

        bus.emit(FolderImagesChanged(folderId, emptyList(), emptyList(), imageIds))
        imageIds.forEach { bus.emit(IllustRelatedItemsUpdated(it, IllustType.IMAGE, folderUpdated = true)) }
    }
    /**
     * 从所有的folders中平滑移除一个image项。
     */
    fun removeItemFromAllFolders(imageId: Int) {
        val relations = data.db.sequenceOf(FolderImageRelations).filter { it.imageId eq imageId }.toList()
        val folderIds = relations.asSequence().map { it.folderId }.toSet()

        for ((folderId, _, ordinal) in relations) {
            data.db.update(FolderImageRelations) {
                where { (it.folderId eq folderId) and (it.ordinal greater ordinal) }
                set(it.ordinal, it.ordinal minus 1)
            }
        }
        data.db.delete(FolderImageRelations) { it.imageId eq imageId }
        data.db.update(Folders) {
            where { it.id inList folderIds }
            set(it.cachedCount, it.cachedCount minus 1)
        }

        for ((folderId, _, _) in relations) {
            bus.emit(FolderImagesChanged(folderId, emptyList(), emptyList(), listOf(imageId)))
        }
        bus.emit(IllustRelatedItemsUpdated(imageId, IllustType.IMAGE, folderUpdated = true))
    }

    /**
     * 向所有指定的folders中平滑添加一个image项。数量+1。
     * @param folders (folderId, ordinal)[]
     */
    fun addItemInFolders(imageId: Int, folders: List<Pair<Int, Int>>) {
        val imageIds = listOf(imageId)
        val imageCounts = mutableMapOf<Int, Int>()
        for ((folderId, ordinal) in folders) {
            imageCounts[folderId] = kit.upsertSubImages(folderId, imageIds, ordinal)
        }
        if(imageCounts.isNotEmpty()) {
            val now = Instant.now()
            data.db.batchUpdate(Folders) {
                for ((folderId, imageCount) in imageCounts) {
                    item {
                        where { it.id eq folderId }
                        set(it.cachedCount, imageCount)
                        set(it.updateTime, now)
                    }
                }
            }
            for ((folderId, _) in imageCounts) {
                bus.emit(FolderImagesChanged(folderId, imageIds, emptyList(), emptyList()))
            }
            bus.emit(IllustRelatedItemsUpdated(imageId, IllustType.IMAGE, folderUpdated = true))
        }
    }
}