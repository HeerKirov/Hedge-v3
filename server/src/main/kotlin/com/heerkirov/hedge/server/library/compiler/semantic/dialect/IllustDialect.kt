package com.heerkirov.hedge.server.library.compiler.semantic.dialect

import com.heerkirov.hedge.server.library.compiler.semantic.framework.*

object IllustDialect : QueryDialect<IllustDialect.IllustSortItem> {
    override val sort = sortListOf<IllustSortItem> {
        item(IllustSortItem.ID, "id")
        item(IllustSortItem.SCORE, "score", "s")
        item(IllustSortItem.PARTITION, "partition", "pt")
        item(IllustSortItem.ORDER_TIME, "order-time", "order", "ot")
        item(IllustSortItem.CREATE_TIME, "create-time", "create", "ct")
        item(IllustSortItem.UPDATE_TIME, "update-time", "update", "ut")
        item(IllustSortItem.SOURCE_ID, "^id", "source-id")
        item(IllustSortItem.SOURCE_SITE, "^site", "source-site")
    }
    override val elements: Array<out ElementFieldDefinition> = arrayOf(MetaTagElementField, AnnotationElementField, SourceTagElementField(true))

    val favorite = flagField("FAVORITE", "favorite", "f")
    val bookMember = flagField("BOOK_MEMBER", "book-member", "bm")
    val id = patternNumberField("ID", "id")
    val score = numberField("SCORE", "score", "s")
    val partition = dateField("PARTITION", "partition", "pt")
    val orderTime = datetimeField("ORDER_TIME", "order", "order-time", "ot")
    val createTime = datetimeField("CREATE_TIME", "create", "create-time", "ct")
    val updateTime = datetimeField("UPDATE_TIME", "update", "update-time", "ut")
    val description = patternStringField("DESCRIPTION", "description", "desc")
    val filesize = sizeField("FILESIZE", "filesize", "size")
    val sourceId = patternNumberField("SOURCE_ID", "^id", "source-id")
    val sourcePage = patternNumberField("SOURCE_PAGE", "^page", "source-page")
    val sourcePageName = stringField("SOURCE_PAGE_NAME", "^page-name", "^pn", "source-page-name")
    val sourceSite = stringField("SOURCE_SITE", "^site", "source-site")
    val sourceTitle = patternStringField("SOURCE_TITLE", "^title", "source-title")
    val sourceDescription = patternStringField("SOURCE_DESCRIPTION", "^description", "^desc", "source-description", "source-desc")
    val fileType = compositionField("FILETYPE", "file-type", "type", "extension", "ext") {
        item("VIDEO", "video")
        item("IMAGE", "image", "img")
        item("JPEG", "jpeg", "jpg")
        item("PNG", "png")
        item("GIF", "gif")
        item("MP4", "mp4")
        item("WEBM", "webm")
    }
    val tagme = compositionField("TAGME", "tagme", allowFlagMode = true) {
        item("TAG", "tag")
        item("TOPIC", "topic")
        item("AUTHOR", "author")
        item("SOURCE", "source")
    }

    enum class IllustSortItem {
        ID, SCORE, PARTITION, ORDER_TIME, CREATE_TIME, UPDATE_TIME, SOURCE_ID, SOURCE_SITE
    }
}