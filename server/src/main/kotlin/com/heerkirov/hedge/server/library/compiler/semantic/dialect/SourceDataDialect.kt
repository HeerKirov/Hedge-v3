package com.heerkirov.hedge.server.library.compiler.semantic.dialect

import com.heerkirov.hedge.server.enums.SourceEditStatus
import com.heerkirov.hedge.server.library.compiler.semantic.framework.*

object SourceDataDialect : QueryDialect<SourceDataDialect.SortItem> {
    override val sort = sortListOf<SortItem> {
        item(SortItem.SOURCE_SITE, "source-site", "src", "site")
        item(SortItem.SOURCE_ID, "source-id", "id")
        item(SortItem.PUBLISH_TIME, "publish-time", "publish", "bt")
    }
    override val elements: Array<out ElementFieldDefinition> = arrayOf(DescriptionFilterElementField(), SourceTagElementField(false))

    val sourceSite = stringField("SOURCE_SITE", "source", "src", "site")
    val sourceId = patternStringField("SOURCE_ID", "source-id", "id", exact = true)
    val title = patternStringField("TITLE", "title")
    val description = patternStringField("DESCRIPTION", "description", "desc")
    val publishTime = datetimeField("PUBLISH_TIME", "publish-time", "publish", "bt")
    val status = enumField<SourceEditStatus>("STATUS", "status", "st") {
        //一个额外的别名，下划线换成了了空格
        item(SourceEditStatus.NOT_EDITED, "NOT EDITED")
        for(value in SourceEditStatus.entries) {
            item(value, value.name)
        }
    }

    enum class SortItem {
        SOURCE_SITE, SOURCE_ID, PUBLISH_TIME
    }
}