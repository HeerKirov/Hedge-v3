package com.heerkirov.hedge.server.dao

import com.heerkirov.hedge.server.enums.ExportType
import com.heerkirov.hedge.server.model.*
import com.heerkirov.hedge.server.utils.ktorm.type.enum
import org.ktorm.dsl.QueryRowSet
import org.ktorm.schema.*

object Books : BaseTable<Book>("book") {
    val id = int("id").primaryKey()
    val title = varchar("title")
    val description = varchar("description")
    val score = int("score")
    val favorite = boolean("favorite")
    val fileId = int("file_id")
    val cachedCount = int("cached_count")
    val createTime = timestamp("create_time")
    val updateTime = timestamp("update_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = Book(
        id = row[id]!!,
        title = row[title]!!,
        description = row[description]!!,
        score = row[score],
        favorite = row[favorite]!!,
        fileId = row[fileId],
        cachedCount = row[cachedCount]!!,
        createTime = row[createTime]!!,
        updateTime = row[updateTime]!!
    )
}

object BookImageRelations : BaseTable<BookImageRelation>("book_image_relation") {
    val bookId = int("book_id")
    val imageId = int("image_id")
    val ordinal = int("ordinal")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = BookImageRelation(
        bookId = row[bookId]!!,
        imageId = row[imageId]!!,
        ordinal = row[ordinal]!!
    )
}

open class BookTagRelations(alias: String?) : EntityMetaRelationTable<BookTagRelation>("book_tag_relation", alias = alias) {
    companion object : BookTagRelations(null)
    override fun aliased(alias: String) = BookTagRelations(alias)

    val bookId = int("book_id")
    val tagId = int("tag_id")
    val isExported = enum("is_exported", typeRef<ExportType>())

    override fun entityId(): Column<Int> = bookId
    override fun metaId(): Column<Int> = tagId
    override fun exported(): Column<ExportType> = isExported

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = BookTagRelation(
        bookId = row[bookId]!!,
        tagId = row[tagId]!!,
        isExported = row[isExported]!!
    )
}

open class BookTopicRelations(alias: String?) : EntityMetaRelationTable<BookTopicRelation>("book_topic_relation", alias = alias) {
    companion object : BookTopicRelations(null)
    override fun aliased(alias: String) = BookTopicRelations(alias)

    val bookId = int("book_id")
    val topicId = int("topic_id")
    val isExported = enum("is_exported", typeRef<ExportType>())

    override fun entityId(): Column<Int> = bookId
    override fun metaId(): Column<Int> = topicId
    override fun exported(): Column<ExportType> = isExported

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = BookTopicRelation(
        bookId = row[bookId]!!,
        topicId = row[topicId]!!,
        isExported = row[isExported]!!
    )
}

open class BookAuthorRelations(alias: String?) : EntityMetaRelationTable<BookAuthorRelation>("book_author_relation", alias = alias) {
    companion object : BookAuthorRelations(null)
    override fun aliased(alias: String) = BookAuthorRelations(alias)

    val bookId = int("book_id")
    val authorId = int("author_id")
    val isExported = enum("is_exported", typeRef<ExportType>())

    override fun entityId(): Column<Int> = bookId
    override fun metaId(): Column<Int> = authorId
    override fun exported(): Column<ExportType> = isExported

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = BookAuthorRelation(
        bookId = row[bookId]!!,
        authorId = row[authorId]!!,
        isExported = row[isExported]!!
    )
}
