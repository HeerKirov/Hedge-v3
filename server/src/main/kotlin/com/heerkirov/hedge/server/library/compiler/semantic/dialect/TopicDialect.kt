package com.heerkirov.hedge.server.library.compiler.semantic.dialect

import com.heerkirov.hedge.server.library.compiler.semantic.framework.*
import com.heerkirov.hedge.server.library.compiler.semantic.plan.MetaType

object TopicDialect : QueryDialect<Nothing> {
    override val elements: Array<out ElementFieldDefinition> = arrayOf(NameFilterElementField, DescriptionFilterElementField(MetaType.TOPIC))

    val parent = patternStringField("PARENT", "parent", "p")
}