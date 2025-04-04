package com.heerkirov.hedge.server.library.compiler.semantic.dialect

import com.heerkirov.hedge.server.library.compiler.semantic.framework.*
import com.heerkirov.hedge.server.library.compiler.semantic.plan.MetaType

object AuthorDialect : QueryDialect<Nothing> {
    override val elements: Array<out ElementFieldDefinition> = arrayOf(NameFilterElementField, DescriptionFilterElementField(MetaType.AUTHOR))
}