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
import com.heerkirov.hedge.server.utils.ktorm.first
import org.ktorm.dsl.*
import org.ktorm.entity.filter
import org.ktorm.entity.sequenceOf
import org.ktorm.entity.toList
import java.time.Instant

class BookManager(private val data: DataRepository,
                  private val bus: EventBus,
                  private val kit: BookKit) {
    /**
     * 新建一个book。
     * @throws ResourceNotExist ("images", number[]) image项不存在。给出imageId列表
     */
    fun newBook(images: List<Illust>, formTitle: String = "", formDescription: String = "", formScore: Int? = null, formFavorite: Boolean = false): Int {
        //新建book时，加入的images将按照它们的orderTime排序
        val sortedImages = images.sortedBy { it.orderTime }
        val fileId = sortedImages.firstOrNull()?.fileId
        val createTime = Instant.now()

        val id = data.db.insertAndGenerateKey(Books) {
            set(it.title, formTitle)
            set(it.description, formDescription)
            set(it.score, formScore)
            set(it.favorite, formFavorite)
            set(it.fileId, fileId)
            set(it.cachedCount, sortedImages.size)
            set(it.createTime, createTime)
            set(it.updateTime, createTime)
        } as Int

        val verifyId = data.db.from(Books).select(max(Books.id).aliased("id")).first().getInt("id")
        if(verifyId != id) {
            throw RuntimeException("Book insert failed. generatedKey is $id but queried verify id is $verifyId.")
        }

        kit.updateSubImages(id, sortedImages.map { it.id })

        kit.refreshAllMeta(id)

        bus.emit(BookCreated(id))
        sortedImages.forEach { bus.emit(IllustRelatedItemsUpdated(it.id, IllustType.IMAGE, bookUpdated = true)) }

        return id
    }

    /**
     * 向book追加新的images。新追加的images将按照Illust的orderTime顺序排列。
     */
    @JvmName("addImagesInBookByIllusts")
    fun addImagesInBook(bookId: Int, images: List<Illust>, ordinal: Int?) {
        val sortedImages = images.sortedBy { it.orderTime }
        val sortedImageIds = sortedImages.map { it.id }
        kit.upsertSubImages(bookId, sortedImageIds, ordinal)
        kit.refreshAllMeta(bookId)

        bus.emit(BookUpdated(bookId, listUpdated = true))
        bus.emit(BookImagesChanged(bookId, sortedImageIds, emptyList(), emptyList()))
        sortedImageIds.forEach { bus.emit(IllustRelatedItemsUpdated(it, IllustType.IMAGE, bookUpdated = true)) }
    }

    /**
     * 向book追加新的images。给出的参数是ID列表，为了获取orderTime，还会再做一次查询。
     */
    fun addImagesInBook(bookId: Int, imageIds: List<Int>, ordinal: Int?) {
        val images = data.db.sequenceOf(Illusts).filter { it.id inList imageIds }.toList()
        addImagesInBook(bookId, images, ordinal)
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
     * 按条件重新排序指定的images。
     */
    fun sortImagesInBook(bookId: Int, imageIds: List<Int>, by: String) {
        val sortedImageIds = when(by) {
            "REVERSE" -> data.db.from(BookImageRelations)
                .select(BookImageRelations.imageId)
                .where { (BookImageRelations.bookId eq bookId) and (BookImageRelations.imageId inList imageIds) }
                .orderBy(BookImageRelations.ordinal.desc())
                .map { it[BookImageRelations.imageId]!! }
            "ORDER_TIME" -> data.db.from(Illusts)
                .select(Illusts.id)
                .where { Illusts.id inList imageIds }
                .orderBy(Illusts.orderTime.asc())
                .map { it[Illusts.id]!! }
            "SOURCE_ID" -> data.db.from(Illusts)
                .select(Illusts.id)
                .where { Illusts.id inList imageIds }
                .orderBy(Illusts.sourceSite.isNull().asc(), Illusts.sourceSite.asc(), Illusts.sourceId.asc(), Illusts.sourcePart.isNull().asc(), Illusts.sourcePart.asc())
                .map { it[Illusts.id]!! }
            else -> throw RuntimeException("sort type $by is not supported.")
        }
        kit.resortSubImages(bookId, sortedImageIds)

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