package com.heerkirov.hedge.server.library.compiler.semantic.dialect

import com.heerkirov.hedge.server.library.compiler.semantic.framework.*

object AnnotationDialect : QueryDialect<Nothing> {
    override val elements: Array<out ElementFieldDefinition> = arrayOf(NameFilterElementField)
}