package com.heerkirov.hedge.server.components.backend

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.ImportImages
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.events.BookDeleted
import com.heerkirov.hedge.server.events.FolderDeleted
import com.heerkirov.hedge.server.events.IllustDeleted
import com.heerkirov.hedge.server.library.framework.Component
import org.ktorm.dsl.*

/**
 * 处理ImportImage相关杂务的后台任务。
 * - 监听collection、book、folder的删除事件，据此清除importImage中的preferences。
 */
interface ImportProcessor : Component

class ImportProcessorImpl(private val data: DataRepository, bus: EventBus) : ImportProcessor {
    init {
        bus.on(arrayOf(IllustDeleted::class, BookDeleted::class, FolderDeleted::class)) {
            it.which {
                each<IllustDeleted>({ e -> e.illustType == IllustType.COLLECTION }) { e -> clean(collectionId = e.illustId) }
                each<BookDeleted> { e -> clean(bookId = e.bookId) }
                each<FolderDeleted> { e -> clean(folderId = e.folderId) }
            }
        }
    }

    private fun clean(collectionId: Int? = null, bookId: Int? = null, folderId: Int? = null) {
        data.db.transaction {
            if(collectionId != null) {
                val selectedIds = data.db.from(ImportImages).select(ImportImages.id)
                    .where { ImportImages.collectionId eq "#${collectionId}" }
                    .map { it[ImportImages.id]!! }
                if(selectedIds.isNotEmpty()) {
                    data.db.update(ImportImages) {
                        where { it.id inList selectedIds }
                        set(it.collectionId, null)
                    }
                }
            }else if(bookId != null) {
                val selected = data.db.from(ImportImages).select(ImportImages.id, ImportImages.bookIds)
                    .where { ImportImages.bookIds like "%|${bookId}|%" }
                    .map { it[ImportImages.id]!! to it[ImportImages.bookIds]!! }
                if(selected.isNotEmpty()) {
                    data.db.batchUpdate(ImportImages) {
                        for ((id, bookIds) in selected) {
                            val newBookIds = bookIds.filter { it != bookId }
                            item {
                                where { it.id eq id }
                                set(it.bookIds, newBookIds)
                            }
                        }
                    }
                }
            }else if(folderId != null) {
                val selected = data.db.from(ImportImages).select(ImportImages.id, ImportImages.folderIds)
                    .where { ImportImages.folderIds like "%|${folderId}|%" }
                    .map { it[ImportImages.id]!! to it[ImportImages.folderIds]!! }
                if(selected.isNotEmpty()) {
                    data.db.batchUpdate(ImportImages) {
                        for ((id, folderIds) in selected) {
                            val newFolderIds = folderIds.filter { it != folderId }
                            item {
                                where { it.id eq id }
                                set(it.folderIds, newFolderIds)
                            }
                        }
                    }
                }
            }
        }
    }
}