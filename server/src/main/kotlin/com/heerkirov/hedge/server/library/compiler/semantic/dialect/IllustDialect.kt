package com.heerkirov.hedge.server.library.compiler.semantic.dialect

import com.heerkirov.hedge.server.library.compiler.semantic.framework.*

object IllustDialect : QueryDialect<IllustDialect.IllustOrderItem> {
    override val order = orderListOf<IllustOrderItem> {
        item(IllustOrderItem.ID, "id")
        item(IllustOrderItem.SCORE, "score", "s")
        item(IllustOrderItem.ORDINAL, "ordinal", "ord")
        item(IllustOrderItem.PARTITION, "partition", "pt")
        item(IllustOrderItem.CREATE_TIME, "create-time", "create", "ct")
        item(IllustOrderItem.UPDATE_TIME, "update-time", "update", "ut")
        item(IllustOrderItem.SOURCE_ID, "^id", "source-id")
        item(IllustOrderItem.SOURCE_SITE, "^site", "source-site")
    }
    override val elements: Array<out ElementFieldDefinition> = arrayOf(MetaTagElementField, AnnotationElementField, SourceTagElementField(true))

    val favorite = flagField("FAVORITE", "favorite", "f")
    val bookMember = flagField("BOOK_MEMBER", "book-member", "bm")
    val id = patternNumberField("ID", "id")
    val score = numberField("SCORE", "score")
    val partition = dateField("PARTITION", "partition", "pt")
    val ordinal = datetimeField("ORDINAL", "ordinal", "ord")
    val createTime = datetimeField("CREATE_TIME", "create", "create-time", "ct")
    val updateTime = datetimeField("UPDATE_TIME", "update", "update-time", "ut")
    val description = patternStringField("DESCRIPTION", "description", "desc")
    val extension = stringField("EXTENSION", "extension", "ext")
    val filesize = sizeField("FILESIZE", "filesize", "size")
    val sourceId = patternNumberField("SOURCE_ID", "^id", "source-id")
    val sourcePage = patternNumberField("SOURCE_PAGE", "^page", "source-page")
    val sourcePageName = stringField("SOURCE_PAGE_NAME", "^page-name", "^pn", "source-page-name")
    val sourceSite = stringField("SOURCE_SITE", "^site", "source-site")
    val sourceDescription = patternStringField("SOURCE_DESCRIPTION", "^description", "^desc", "source-description", "source-desc")
    val tagme = compositionField<Tagme>("TAGME", "tagme") {
        for (value in Tagme.entries) {
            item(value, value.name)
        }
    }

    enum class IllustOrderItem {
        ID, SCORE, ORDINAL, PARTITION, CREATE_TIME, UPDATE_TIME, SOURCE_ID, SOURCE_SITE
    }
    enum class Tagme {
        TAG, AUTHOR, TOPIC, SOURCE
    }
}