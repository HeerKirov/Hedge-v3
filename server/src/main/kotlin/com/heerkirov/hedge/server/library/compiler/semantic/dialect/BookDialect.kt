package com.heerkirov.hedge.server.library.compiler.semantic.dialect

import com.heerkirov.hedge.server.library.compiler.semantic.framework.*

object BookDialect : QueryDialect<BookDialect.BookSortItem> {
    override val sort = sortListOf<BookSortItem> {
        item(BookSortItem.ID, "id")
        item(BookSortItem.SCORE, "score", "s")
        item(BookSortItem.IMAGE_COUNT, "image-count", "count")
        item(BookSortItem.CREATE_TIME, "create-time", "create", "ct")
        item(BookSortItem.UPDATE_TIME, "update-time", "update", "ut")
    }
    override val elements: Array<out ElementFieldDefinition> = arrayOf(MetaTagElementField, DescriptionFilterElementField())

    val favorite = flagField("FAVORITE", "favorite", "f")
    val id = patternNumberField("ID", "id")
    val score = numberField("SCORE", "score")
    val imageCount = numberField("IMAGE_COUNT", "count", "image-count")
    val createTime = datetimeField("CREATE_TIME", "create", "create-time", "ct")
    val updateTime = datetimeField("UPDATE_TIME", "update", "update-time", "ut")
    val title = patternStringField("TITLE", "title")
    val description = patternStringField("DESCRIPTION", "description", "desc")

    enum class BookSortItem {
        ID, SCORE, IMAGE_COUNT, CREATE_TIME, UPDATE_TIME
    }
}