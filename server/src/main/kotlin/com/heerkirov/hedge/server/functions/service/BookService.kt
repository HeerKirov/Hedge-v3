package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.filter.BookQueryFilter
import com.heerkirov.hedge.server.dto.filter.LimitAndOffsetFilter
import com.heerkirov.hedge.server.dto.form.BatchAction
import com.heerkirov.hedge.server.dto.form.BookCreateForm
import com.heerkirov.hedge.server.dto.form.BookImagesPartialUpdateForm
import com.heerkirov.hedge.server.dto.form.BookUpdateForm
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.enums.TagAddressType
import com.heerkirov.hedge.server.events.BookDeleted
import com.heerkirov.hedge.server.events.BookImagesChanged
import com.heerkirov.hedge.server.events.BookUpdated
import com.heerkirov.hedge.server.events.IllustRelatedItemsUpdated
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.kit.BookKit
import com.heerkirov.hedge.server.functions.manager.BookManager
import com.heerkirov.hedge.server.functions.manager.IllustManager
import com.heerkirov.hedge.server.functions.manager.query.QueryManager
import com.heerkirov.hedge.server.utils.business.filePathFrom
import com.heerkirov.hedge.server.utils.DateTime.toInstant
import com.heerkirov.hedge.server.utils.business.sourcePathOf
import com.heerkirov.hedge.server.utils.business.toListResult
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.runIf
import com.heerkirov.hedge.server.utils.types.*
import org.ktorm.dsl.*
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import java.time.Instant

class BookService(private val appdata: AppDataManager,
                  private val data: DataRepository,
                  private val bus: EventBus,
                  private val kit: BookKit,
                  private val bookManager: BookManager,
                  private val illustManager: IllustManager,
                  private val queryManager: QueryManager) {
    private val orderTranslator = OrderTranslator {
        "id" to Books.id
        "createTime" to Books.createTime
        "updateTime" to Books.updateTime
        "score" to Books.score nulls last
    }

    fun list(filter: BookQueryFilter): ListResult<BookRes> {
        val schema = if(filter.query.isNullOrBlank()) null else {
            queryManager.querySchema(filter.query, QueryManager.Dialect.BOOK).executePlan ?: return ListResult(0, emptyList())
        }
        return data.db.from(Books)
            .leftJoin(FileRecords, Books.fileId eq FileRecords.id and FileRecords.deleted.not())
            .let { schema?.joinConditions?.fold(it) { acc, join -> if(join.left) acc.leftJoin(join.table, join.condition) else acc.innerJoin(join.table, join.condition) } ?: it }
            .select(Books.id, Books.title, Books.cachedCount, Books.score, Books.favorite, Books.createTime, Books.updateTime,
                FileRecords.status, FileRecords.block, FileRecords.id, FileRecords.extension)
            .whereWithConditions {
                if(filter.favorite != null) {
                    it += if(filter.favorite) Books.favorite else Books.favorite.not()
                }
                if(schema != null && schema.whereConditions.isNotEmpty()) {
                    it.addAll(schema.whereConditions)
                }
            }
            .runIf(schema?.distinct == true) { groupBy(Books.id) }
            .limit(filter.offset, filter.limit)
            .orderBy(orderTranslator, filter.order, schema?.orderConditions, default = descendingOrderItem("createTime"))
            .toListResult {
                val id = it[Books.id]!!
                val title = it[Books.title]!!
                val imageCount = it[Books.cachedCount]!!
                val filePath = if(it[FileRecords.id] != null) filePathFrom(it) else null
                val score = it[Books.score]
                val favorite = it[Books.favorite]!!
                val createTime = it[Books.createTime]!!
                val updateTime = it[Books.updateTime]!!
                BookRes(id, title, imageCount, filePath, score, favorite, createTime, updateTime)
            }

    }

    /**
     * @throws ResourceNotExist ("images", number[]) image项不存在。给出imageId列表
     */
    fun create(form: BookCreateForm): Int {
        if(form.score != null) kit.validateScore(form.score)
        data.db.transaction {
            val images = illustManager.unfoldImages(form.images)
            return bookManager.newBook(images, form.title ?: "", form.description ?: "", form.score, form.favorite)
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun get(id: Int): BookDetailRes {
        val row = data.db.from(Books)
            .leftJoin(FileRecords, Books.fileId eq FileRecords.id and FileRecords.deleted.not())
            .select(Books.id, Books.title, Books.description, Books.cachedCount,
                Books.score, Books.favorite, Books.createTime, Books.updateTime,
                FileRecords.block, FileRecords.id, FileRecords.extension, FileRecords.status)
            .where { Books.id eq id }
            .firstOrNull()
            ?: throw be(NotFound())

        val filePath = if(row[FileRecords.id] != null) filePathFrom(row) else null

        val title = row[Books.title]!!
        val description = row[Books.description]!!
        val imageCount = row[Books.cachedCount]!!
        val score = row[Books.score]
        val favorite = row[Books.favorite]!!
        val createTime = row[Books.createTime]!!
        val updateTime = row[Books.updateTime]!!

        val authorColors = appdata.setting.meta.authorColors
        val topicColors = appdata.setting.meta.topicColors

        val topics = data.db.from(Topics)
            .innerJoin(BookTopicRelations, BookTopicRelations.topicId eq Topics.id)
            .select(Topics.id, Topics.name, Topics.type, BookTopicRelations.isExported)
            .where { BookTopicRelations.bookId eq id }
            .orderBy(Topics.type.asc(), Topics.id.asc())
            .map {
                val topicType = it[Topics.type]!!
                val color = topicColors[topicType]
                TopicSimpleRes(it[Topics.id]!!, it[Topics.name]!!, topicType, it[BookTopicRelations.isExported]!!, color)
            }

        val authors = data.db.from(Authors)
            .innerJoin(BookAuthorRelations, BookAuthorRelations.authorId eq Authors.id)
            .select(Authors.id, Authors.name, Authors.type, BookAuthorRelations.isExported)
            .where { BookAuthorRelations.bookId eq id }
            .orderBy(Authors.type.asc(), Authors.id.asc())
            .map {
                val authorType = it[Authors.type]!!
                val color = authorColors[authorType]
                AuthorSimpleRes(it[Authors.id]!!, it[Authors.name]!!, authorType, it[BookAuthorRelations.isExported]!!, color)
            }

        val tags = data.db.from(Tags)
            .innerJoin(BookTagRelations, BookTagRelations.tagId eq Tags.id)
            .select(Tags.id, Tags.name, Tags.color, BookTagRelations.isExported)
            .where { (BookTagRelations.bookId eq id) and (Tags.type eq TagAddressType.TAG) }
            .orderBy(Tags.globalOrdinal.asc())
            .map { TagSimpleRes(it[Tags.id]!!, it[Tags.name]!!, it[Tags.color], it[BookTagRelations.isExported]!!) }

        return BookDetailRes(id, title, imageCount, filePath, topics, authors, tags, description, score, favorite, createTime, updateTime)
    }

    /**
     * @throws NotFound 请求对象不存在
     * @throws ResourceNotExist ("topics", number[]) 部分topics资源不存在。给出不存在的topic id列表
     * @throws ResourceNotExist ("authors", number[]) 部分authors资源不存在。给出不存在的author id列表
     * @throws ResourceNotExist ("tags", number[]) 部分tags资源不存在。给出不存在的tag id列表
     * @throws ResourceNotSuitable ("tags", number[]) 部分tags资源不适用。地址段不适用于此项。给出不适用的tag id列表
     * @throws ConflictingGroupMembersError 发现标签冲突组
     */
    fun update(id: Int, form: BookUpdateForm) {
        data.db.transaction {
            data.db.sequenceOf(Books).firstOrNull { it.id eq id } ?: throw be(NotFound())

            form.score.alsoOpt { if(it != null) kit.validateScore(it) }
            val newTitle = form.title.letOpt { it ?: "" }
            val newDescription = form.description.letOpt { it ?: "" }

            if(anyOpt(form.tags, form.authors, form.topics)) {
                kit.updateMeta(id, newTags = form.tags, newTopics = form.topics, newAuthors = form.authors)
            }

            if(anyOpt(form.score, form.favorite, newTitle, newDescription)) {
                data.db.update(Books) {
                    where { it.id eq id }
                    form.score.applyOpt { set(it.score, this) }
                    form.favorite.applyOpt { set(it.favorite, this) }
                    newTitle.applyOpt { set(it.title, this) }
                    newDescription.applyOpt { set(it.description, this) }
                }
            }

            val listUpdated = anyOpt(form.score, form.favorite, newTitle, newDescription)
            val detailUpdated = listUpdated || anyOpt(form.tags, form.authors, form.topics)
            if(listUpdated || detailUpdated) {
                bus.emit(BookUpdated(id, listUpdated, detailUpdated = true))
            }
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun delete(id: Int) {
        data.db.transaction {
            data.db.sequenceOf(Books).firstOrNull { it.id eq id } ?: throw be(NotFound())

            val childrenIds = data.db.from(BookImageRelations).select(BookImageRelations.imageId).where { BookImageRelations.bookId eq id }.map { it[BookImageRelations.imageId]!! }

            data.db.delete(Books) { it.id eq id }
            data.db.delete(BookTagRelations) { it.bookId eq id }
            data.db.delete(BookTopicRelations) { it.bookId eq id }
            data.db.delete(BookAuthorRelations) { it.bookId eq id }
            data.db.delete(BookAnnotationRelations) { it.bookId eq id }
            data.db.delete(BookImageRelations) { it.bookId eq id }

            bus.emit(BookDeleted(id))
            childrenIds.forEach { bus.emit(IllustRelatedItemsUpdated(it, IllustType.IMAGE, bookUpdated = true)) }
        }
    }

    fun getImages(id: Int, filter: LimitAndOffsetFilter): ListResult<BookImageRes> {
        return data.db.from(BookImageRelations)
            .leftJoin(Illusts, BookImageRelations.imageId eq Illusts.id)
            .leftJoin(FileRecords, Illusts.fileId eq FileRecords.id and FileRecords.deleted.not())
            .select(BookImageRelations.ordinal, Illusts.id,
                Illusts.exportedScore, Illusts.favorite, Illusts.tagme, Illusts.orderTime,
                Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, Illusts.sourcePartName,
                FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { BookImageRelations.bookId eq id }
            .limit(filter.offset, filter.limit)
            .orderBy(BookImageRelations.ordinal.asc())
            .toListResult {
                val ordinal = it[BookImageRelations.ordinal]!!
                val imageId = it[Illusts.id]!!
                val score = it[Illusts.exportedScore]
                val favorite = it[Illusts.favorite]!!
                val tagme = it[Illusts.tagme]!!
                val orderTime = it[Illusts.orderTime]!!.toInstant()
                val filePath = filePathFrom(it)
                val source = sourcePathOf(it)
                BookImageRes(imageId, ordinal, filePath, score, favorite, tagme, source, orderTime)
            }
    }

    /**
     * @throws NotFound 请求对象不存在
     * @throws ResourceNotExist ("images", number[]) image项不存在，给出imageId列表
     */
    fun updateImages(id: Int, items: List<Int>) {
        data.db.transaction {
            data.db.sequenceOf(Books).firstOrNull { Books.id eq id } ?: throw be(NotFound())

            val images = illustManager.unfoldImages(items)
            val imageIds = images.map { it.id }
            val fileId = images.firstOrNull()?.fileId

            data.db.update(Books) {
                where { it.id eq id }
                set(it.fileId, fileId)
                set(it.cachedCount, images.size)
                set(it.updateTime, Instant.now())
            }

            val oldIdSet = kit.updateSubImages(id, imageIds).toSet()
            val imageIdSet = imageIds.toSet()

            kit.refreshAllMeta(id)

            bus.emit(BookUpdated(id, listUpdated = true))
            val added = (imageIdSet - oldIdSet).toList()
            val deleted = (oldIdSet - imageIdSet).toList()
            bus.emit(BookImagesChanged(id, added, emptyList(), deleted))
            added.forEach { bus.emit(IllustRelatedItemsUpdated(it, IllustType.IMAGE, bookUpdated = true)) }
            deleted.forEach { bus.emit(IllustRelatedItemsUpdated(it, IllustType.IMAGE, bookUpdated = true)) }
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     * @throws ResourceNotExist ("images", number[]) image项不存在，给出imageId列表
     * @throws ResourceNotExist ("itemIndexes", number[]) 要操作的image index不存在。给出不存在的index列表
     */
    fun partialUpdateImages(id: Int, form: BookImagesPartialUpdateForm) {
        data.db.transaction {
            data.db.sequenceOf(Books).firstOrNull { Books.id eq id } ?: throw be(NotFound())

            when (form.action) {
                BatchAction.ADD -> {
                    //添加新项目。添加时，结果按照表单的列表顺序排序。
                    //也可以用来移动已存在的项目。
                    val formImages = form.images ?: throw be(ParamRequired("images"))
                    val images = illustManager.unfoldImages(formImages)
                    if(images.isNotEmpty()) {
                        val imageIds = images.map { it.id }
                        bookManager.addImagesInBook(id, imageIds, form.ordinal)
                    }
                }
                BatchAction.MOVE -> {
                    //移动现存的项目。被移动的项目之间仍保持ordinal的顺序挪到新位置。
                    //不能用来添加新项目，会被忽略。
                    val formImages = form.images ?: throw be(ParamRequired("images"))
                    if(formImages.isNotEmpty()) {
                        bookManager.moveImagesInBook(id, formImages, form.ordinal)
                    }
                }
                BatchAction.DELETE -> {
                    val formImages = form.images ?: throw be(ParamRequired("images"))
                    if(formImages.isNotEmpty()) {
                        bookManager.removeImagesFromBook(id, formImages)
                    }
                }
            }
        }
    }
}