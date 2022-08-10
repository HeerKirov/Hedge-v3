package com.heerkirov.hedge.server.library.compiler.semantic.dialect

import com.heerkirov.hedge.server.library.compiler.semantic.framework.*

object BookDialect : QueryDialect<BookDialect.BookOrderItem> {
    override val order = orderListOf<BookOrderItem> {
        item(BookOrderItem.ID, "id")
        item(BookOrderItem.SCORE, "score", "s")
        item(BookOrderItem.IMAGE_COUNT, "image-count", "count")
        item(BookOrderItem.CREATE_TIME, "create-time", "create", "ct")
        item(BookOrderItem.UPDATE_TIME, "update-time", "update", "ut")
    }
    override val elements: Array<out ElementFieldDefinition> = arrayOf(MetaTagElementField, AnnotationElementField)

    val favorite = flagField("FAVORITE", "favorite", "f")
    val id = patternNumberField("ID", "id")
    val score = numberField("SCORE", "score")
    val imageCount = numberField("IMAGE_COUNT", "count", "image-count")
    val createTime = dateField("CREATE_TIME", "create", "create-time", "ct")
    val updateTime = dateField("UPDATE_TIME", "update", "update-time", "ut")
    val title = patternStringField("TITLE", "title")
    val description = patternStringField("DESCRIPTION", "description", "desc")

    enum class BookOrderItem {
        ID, SCORE, IMAGE_COUNT, CREATE_TIME, UPDATE_TIME
    }
}