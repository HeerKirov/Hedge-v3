package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.FolderImageRelations
import com.heerkirov.hedge.server.dao.Folders
import com.heerkirov.hedge.server.functions.kit.FolderKit
import com.heerkirov.hedge.server.utils.DateTime
import org.ktorm.dsl.*
import org.ktorm.entity.filter
import org.ktorm.entity.sequenceOf
import org.ktorm.entity.toList

class FolderManager(private val data: DataRepository, private val kit: FolderKit, private val illustManager: IllustManager) {
    /**
     * 从所有的folders中平滑移除一个image项。
     */
    fun removeItemInAllFolders(imageId: Int) {
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
            val now = DateTime.now()
            data.db.batchUpdate(Folders) {
                for ((folderId, imageCount) in imageCounts) {
                    item {
                        where { it.id eq folderId }
                        set(it.cachedCount, imageCount)
                        set(it.updateTime, now)
                    }
                }
            }
        }
    }
}