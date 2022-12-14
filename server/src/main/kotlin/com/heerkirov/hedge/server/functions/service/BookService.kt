package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.backend.exporter.BackendExporter
import com.heerkirov.hedge.server.components.backend.exporter.IllustBookMemberExporterTask
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
import com.heerkirov.hedge.server.enums.TagAddressType
import com.heerkirov.hedge.server.events.BookDeleted
import com.heerkirov.hedge.server.events.BookImagesChanged
import com.heerkirov.hedge.server.events.BookUpdated
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.kit.BookKit
import com.heerkirov.hedge.server.functions.manager.BookManager
import com.heerkirov.hedge.server.functions.manager.IllustManager
import com.heerkirov.hedge.server.functions.manager.query.QueryManager
import com.heerkirov.hedge.server.utils.business.takeAllFilepath
import com.heerkirov.hedge.server.utils.DateTime
import com.heerkirov.hedge.server.utils.DateTime.parseDateTime
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.runIf
import com.heerkirov.hedge.server.utils.types.*
import org.ktorm.dsl.*
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf

class BookService(private val data: DataRepository,
                  private val bus: EventBus,
                  private val kit: BookKit,
                  private val bookManager: BookManager,
                  private val illustManager: IllustManager,
                  private val queryManager: QueryManager,
                  private val backendExporter: BackendExporter) {
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
            .leftJoin(FileRecords, Books.fileId eq FileRecords.id)
            .let { schema?.joinConditions?.fold(it) { acc, join -> if(join.left) acc.leftJoin(join.table, join.condition) else acc.innerJoin(join.table, join.condition) } ?: it }
            .select(Books.id, Books.title, Books.cachedCount, Books.score, Books.favorite, Books.createTime, Books.updateTime,
                FileRecords.status, FileRecords.folder, FileRecords.id, FileRecords.extension)
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
                val (file, thumbnailFile) = if(it[FileRecords.id] != null) takeAllFilepath(it) else null to null
                val score = it[Books.score]
                val favorite = it[Books.favorite]!!
                val createTime = it[Books.createTime]!!
                val updateTime = it[Books.updateTime]!!
                BookRes(id, title, imageCount, file, thumbnailFile, score, favorite, createTime, updateTime)
            }

    }

    /**
     * @throws ResourceNotExist ("images", number[]) image?????????????????????imageId??????
     */
    fun create(form: BookCreateForm): Int {
        if(form.score != null) kit.validateScore(form.score)
        data.db.transaction {
            return bookManager.newBook(form.images, form.title ?: "", form.description ?: "", form.score, form.favorite)
        }
    }

    /**
     * @throws NotFound ?????????????????????
     */
    fun get(id: Int): BookDetailRes {
        val row = data.db.from(Books)
            .leftJoin(FileRecords, Books.fileId eq FileRecords.id)
            .select(Books.id, Books.title, Books.description, Books.cachedCount,
                Books.score, Books.favorite, Books.createTime, Books.updateTime,
                FileRecords.folder, FileRecords.id, FileRecords.extension, FileRecords.status)
            .where { Books.id eq id }
            .firstOrNull()
            ?: throw be(NotFound())

        val (file, thumbnailFile) = if(row[FileRecords.id] != null) takeAllFilepath(row) else null to null

        val title = row[Books.title]!!
        val description = row[Books.description]!!
        val imageCount = row[Books.cachedCount]!!
        val score = row[Books.score]
        val favorite = row[Books.favorite]!!
        val createTime = row[Books.createTime]!!
        val updateTime = row[Books.updateTime]!!

        val authorColors = data.setting.meta.authorColors
        val topicColors = data.setting.meta.topicColors

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

        return BookDetailRes(id, title, imageCount, file, thumbnailFile, topics, authors, tags, description, score, favorite, createTime, updateTime)
    }

    /**
     * @throws NotFound ?????????????????????
     * @throws ResourceNotExist ("topics", number[]) ??????topics????????????????????????????????????topic id??????
     * @throws ResourceNotExist ("authors", number[]) ??????authors????????????????????????????????????author id??????
     * @throws ResourceNotExist ("tags", number[]) ??????tags????????????????????????????????????tag id??????
     * @throws ResourceNotSuitable ("tags", number[]) ??????tags??????????????????????????????????????????????????????????????????tag id??????
     * @throws ConflictingGroupMembersError ?????????????????????
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

            val generalUpdated = anyOpt(form.score, form.favorite, newTitle, newDescription)
            val metaTagUpdated = anyOpt(form.tags, form.authors, form.topics)
            if(generalUpdated || metaTagUpdated) {
                bus.emit(BookUpdated(id, generalUpdated, metaTagUpdated))
            }
        }
    }

    /**
     * @throws NotFound ?????????????????????
     */
    fun delete(id: Int) {
        data.db.transaction {
            data.db.sequenceOf(Books).firstOrNull { it.id eq id } ?: throw be(NotFound())

            data.db.delete(Books) { it.id eq id }
            data.db.delete(BookTagRelations) { it.bookId eq id }
            data.db.delete(BookTopicRelations) { it.bookId eq id }
            data.db.delete(BookAuthorRelations) { it.bookId eq id }
            data.db.delete(BookAnnotationRelations) { it.bookId eq id }
            data.db.delete(BookImageRelations) { it.bookId eq id }

            bus.emit(BookDeleted(id))
        }
    }

    fun getImages(id: Int, filter: LimitAndOffsetFilter): ListResult<BookImageRes> {
        return data.db.from(BookImageRelations)
            .leftJoin(Illusts, BookImageRelations.imageId eq Illusts.id)
            .leftJoin(FileRecords, Illusts.fileId eq FileRecords.id)
            .select(BookImageRelations.ordinal, Illusts.id,
                Illusts.exportedScore, Illusts.favorite, Illusts.tagme, Illusts.orderTime,
                Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart,
                FileRecords.id, FileRecords.folder, FileRecords.extension, FileRecords.status)
            .where { BookImageRelations.bookId eq id }
            .limit(filter.offset, filter.limit)
            .orderBy(BookImageRelations.ordinal.asc())
            .toListResult {
                val ordinal = it[BookImageRelations.ordinal]!!
                val imageId = it[Illusts.id]!!
                val score = it[Illusts.exportedScore]
                val favorite = it[Illusts.favorite]!!
                val tagme = it[Illusts.tagme]!!
                val orderTime = it[Illusts.orderTime]!!.parseDateTime()
                val (file, thumbnailFile) = takeAllFilepath(it)
                val sourceSite = it[Illusts.sourceSite]
                val sourceId = it[Illusts.sourceId]
                val sourcePart = it[Illusts.sourcePart]
                BookImageRes(imageId, ordinal, file, thumbnailFile, score, favorite, tagme, sourceSite, sourceId, sourcePart, orderTime)
            }
    }

    /**
     * @throws NotFound ?????????????????????
     * @throws ResourceNotExist ("images", number[]) image?????????????????????imageId??????
     */
    fun updateImages(id: Int, items: List<Int>) {
        data.db.transaction {
            data.db.sequenceOf(Books).firstOrNull { Books.id eq id } ?: throw be(NotFound())

            val images = if(items.isNotEmpty()) illustManager.unfoldImages(items) else emptyList()
            val imageIds = images.map { it.id }
            val fileId = images.firstOrNull()?.fileId

            data.db.update(Books) {
                where { it.id eq id }
                set(it.fileId, fileId)
                set(it.cachedCount, images.size)
                set(it.updateTime, DateTime.now())
            }

            val oldIdSet = kit.updateSubImages(id, imageIds).toSet()
            val imageIdSet = imageIds.toSet()

            kit.refreshAllMeta(id)

            backendExporter.add(IllustBookMemberExporterTask((imageIdSet + oldIdSet).toList()))

            bus.emit(BookImagesChanged(id, (imageIdSet - oldIdSet).toList(), emptyList(), (oldIdSet - imageIdSet).toList()))
        }
    }

    /**
     * @throws NotFound ?????????????????????
     * @throws ResourceNotExist ("images", number[]) image?????????????????????imageId??????
     * @throws ResourceNotExist ("itemIndexes", number[]) ????????????image index??????????????????????????????index??????
     */
    fun partialUpdateImages(id: Int, form: BookImagesPartialUpdateForm) {
        data.db.transaction {
            data.db.sequenceOf(Books).firstOrNull { Books.id eq id } ?: throw be(NotFound())

            when (form.action) {
                BatchAction.ADD -> {
                    //????????????????????????????????????????????????????????????????????????
                    //??????????????????????????????????????????
                    val formImages = form.images ?: throw be(ParamRequired("images"))
                    val images = illustManager.unfoldImages(formImages)
                    if(images.isNotEmpty()) {
                        val imageIds = images.map { it.id }
                        kit.upsertSubImages(id, imageIds, form.ordinal)
                        kit.refreshAllMeta(id)
                        backendExporter.add(IllustBookMemberExporterTask(imageIds))

                        bus.emit(BookImagesChanged(id, imageIds, emptyList(), emptyList()))
                    }
                }
                BatchAction.MOVE -> {
                    //?????????????????????????????????????????????????????????ordinal???????????????????????????
                    //?????????????????????????????????????????????
                    val formImages = form.images ?: throw be(ParamRequired("images"))
                    if(formImages.isNotEmpty()) {
                        kit.moveSubImages(id, formImages, form.ordinal)
                        //tips: move?????????????????????meta
                        backendExporter.add(IllustBookMemberExporterTask(formImages))

                        bus.emit(BookImagesChanged(id, emptyList(), formImages, emptyList()))
                    }
                }
                BatchAction.DELETE -> {
                    val formImages = form.images ?: throw be(ParamRequired("images"))
                    if(formImages.isNotEmpty()) {
                        kit.deleteSubImages(id, formImages)
                        kit.refreshAllMeta(id)
                        backendExporter.add(IllustBookMemberExporterTask(formImages))

                        bus.emit(BookImagesChanged(id, emptyList(), emptyList(), formImages))
                    }
                }
            }
        }
    }
}