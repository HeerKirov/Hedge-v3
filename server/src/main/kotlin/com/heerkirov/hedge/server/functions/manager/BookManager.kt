package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.BookImageRelations
import com.heerkirov.hedge.server.dao.Books
import com.heerkirov.hedge.server.dao.Illusts
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.events.BookCreated
import com.heerkirov.hedge.server.events.BookImagesChanged
import com.heerkirov.hedge.server.events.BookUpdated
import com.heerkirov.hedge.server.events.IllustRelatedItemsUpdated
import com.heerkirov.hedge.server.exceptions.ResourceNotExist
import com.heerkirov.hedge.server.functions.kit.BookKit
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.utils.DateTime
import org.ktorm.dsl.*
import org.ktorm.entity.filter
import org.ktorm.entity.sequenceOf
import org.ktorm.entity.toList

class BookManager(private val data: DataRepository,
                  private val bus: EventBus,
                  private val kit: BookKit) {
    /**
     * 新建一个book。
     * @throws ResourceNotExist ("images", number[]) image项不存在。给出imageId列表
     */
    fun newBook(images: List<Illust>, formTitle: String = "", formDescription: String = "", formScore: Int? = null, formFavorite: Boolean = false): Int {
        val fileId = images.firstOrNull()?.fileId
        val createTime = DateTime.now()

        val id = data.db.insertAndGenerateKey(Books) {
            set(it.title, formTitle)
            set(it.description, formDescription)
            set(it.score, formScore)
            set(it.favorite, formFavorite)
            set(it.fileId, fileId)
            set(it.cachedCount, images.size)
            set(it.createTime, createTime)
            set(it.updateTime, createTime)
        } as Int

        kit.updateSubImages(id, images.map { it.id })

        kit.refreshAllMeta(id)

        bus.emit(BookCreated(id))
        images.forEach { bus.emit(IllustRelatedItemsUpdated(it.id, IllustType.IMAGE, bookUpdated = true)) }

        return id
    }

    /**
     * 向book追加新的images。
     */
    fun addImagesInBook(bookId: Int, imageIds: List<Int>, ordinal: Int?) {
        kit.upsertSubImages(bookId, imageIds, ordinal)
        kit.refreshAllMeta(bookId)

        bus.emit(BookUpdated(bookId, listUpdated = true))
        bus.emit(BookImagesChanged(bookId, imageIds, emptyList(), emptyList()))
        imageIds.forEach { bus.emit(IllustRelatedItemsUpdated(it, IllustType.IMAGE, bookUpdated = true)) }
    }

    /**
     * 移动images.
     */
    fun moveImagesInBook(bookId: Int, imageIds: List<Int>, ordinal: Int?) {
        kit.moveSubImages(bookId, imageIds, ordinal)
        //tips: move操作不需要重置meta

        bus.emit(BookImagesChanged(bookId, emptyList(), imageIds, emptyList()))
    }

    /**
     * 从book移除images。
     */
    fun removeImagesFromBook(bookId: Int, imageIds: List<Int>) {
        kit.deleteSubImages(bookId, imageIds)
        kit.refreshAllMeta(bookId)

        bus.emit(BookUpdated(bookId, listUpdated = true))
        bus.emit(BookImagesChanged(bookId, emptyList(), emptyList(), imageIds))
        imageIds.forEach { bus.emit(IllustRelatedItemsUpdated(it, IllustType.IMAGE, bookUpdated = true)) }
    }

    /**
     * 从所有的books中平滑移除一个image项。将数量统计-1。如果删掉的image是封面，重新获得下一张封面。
     */
    fun removeItemFromAllBooks(imageId: Int) {
        val relations = data.db.sequenceOf(BookImageRelations).filter { it.imageId eq imageId }.toList()
        val bookIds = relations.asSequence().map { it.bookId }.toSet()

        for ((bookId, _, ordinal) in relations) {
            data.db.update(BookImageRelations) {
                where { (it.bookId eq bookId) and (it.ordinal greater ordinal) }
                set(it.ordinal, it.ordinal minus 1)
            }
            if(ordinal == 0) {
                //ordinal为0表示此image在此book中是封面，因此需要导出新的封面。
                val newCoverFileId = data.db.from(BookImageRelations).innerJoin(Illusts, BookImageRelations.imageId eq Illusts.id)
                    .select(Illusts.fileId)
                    .where { (BookImageRelations.bookId eq bookId) and (BookImageRelations.ordinal eq 0) }
                    .map { it[Illusts.fileId]!! }
                    .firstOrNull()
                data.db.update(Books) {
                    where { it.id eq bookId }
                    set(it.fileId, newCoverFileId)
                }
            }
        }
        data.db.delete(BookImageRelations) { it.imageId eq imageId }
        data.db.update(Books) {
            where { it.id inList bookIds }
            set(it.cachedCount, it.cachedCount minus 1)
        }

        for ((bookId, _, ordinal) in relations) {
            bus.emit(BookUpdated(bookId, listUpdated = ordinal == 0))
            bus.emit(BookImagesChanged(bookId, emptyList(), emptyList(), listOf(imageId)))
        }
        bus.emit(IllustRelatedItemsUpdated(imageId, IllustType.IMAGE, bookUpdated = true))
    }

    /**
     * 向所有指定的books中平滑添加一个image项，数量+1，并重新导出。
     * @param books (bookId, ordinal)[]
     */
    fun addItemInBooks(imageId: Int, books: List<Pair<Int, Int>>) {
        val imageIds = listOf(imageId)
        for ((bookId, ordinal) in books) {
            kit.upsertSubImages(bookId, imageIds, ordinal)

            bus.emit(BookUpdated(bookId, listUpdated = true))
            bus.emit(BookImagesChanged(bookId, imageIds, emptyList(), emptyList()))
            imageIds.forEach { bus.emit(IllustRelatedItemsUpdated(it, IllustType.IMAGE, bookUpdated = true)) }
        }
    }
}