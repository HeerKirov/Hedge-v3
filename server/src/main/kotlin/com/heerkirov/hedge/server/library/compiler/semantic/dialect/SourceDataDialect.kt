package com.heerkirov.hedge.server.library.compiler.semantic.dialect

import com.heerkirov.hedge.server.library.compiler.semantic.framework.*

object SourceDataDialect : QueryDialect<SourceDataDialect.OrderItem> {
    override val order = orderListOf<OrderItem> {
        item(OrderItem.SOURCE_SITE, "source-site", "src", "site", "s")
        item(OrderItem.SOURCE_ID, "source-id", "id")
    }
    override val elements: Array<out ElementFieldDefinition> = arrayOf(SourceTagElementField(false))

    val sourceSite = stringField("SOURCE_SITE", "source", "src", "site", "s")
    val sourceId = patternNumberField("SOURCE_ID", "source-id", "id")
    val title = patternStringField("TITLE", "title")
    val description = patternStringField("DESCRIPTION", "description", "desc")

    enum class OrderItem {
        SOURCE_SITE, SOURCE_ID
    }
}