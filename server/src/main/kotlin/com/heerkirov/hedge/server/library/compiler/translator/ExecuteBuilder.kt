package com.heerkirov.hedge.server.library.compiler.translator

import com.heerkirov.hedge.server.library.compiler.semantic.plan.Filter
import com.heerkirov.hedge.server.library.compiler.semantic.plan.FilterValue
import com.heerkirov.hedge.server.library.compiler.semantic.plan.Sort
import com.heerkirov.hedge.server.library.compiler.translator.visual.*

/**
 * 执行计划翻译器。
 */
interface ExecuteBuilder {
    fun mapSorts(sorts: List<Sort<*>>) {
        throw UnsupportedOperationException("Unsupported.")
    }

    fun mapFilter(unionItems: Collection<Filter<out FilterValue>>, exclude: Boolean) {
        throw UnsupportedOperationException("Unsupported.")
    }

    fun mapNameElement(unionItems: List<ElementString>, exclude: Boolean) {
        throw UnsupportedOperationException("Unsupported element type 'name'.")
    }

    fun mapCommentElement(unionItems: List<ElementString>, exclude: Boolean) {
        throw UnsupportedOperationException("Unsupported element type 'description'.")
    }

    fun mapSourceTagElement(unionItems: List<ElementSourceTag>, exclude: Boolean) {
        throw UnsupportedOperationException("Unsupported element type 'source-tag'.")
    }

    fun mapTopicElement(unionItems: List<ElementTopic>, exclude: Boolean) {
        throw UnsupportedOperationException("Unsupported element type 'topic'.")
    }

    fun mapTagElement(unionItems: List<ElementTag>, exclude: Boolean) {
        throw UnsupportedOperationException("Unsupported element type 'tag'.")
    }

    fun mapAuthorElement(unionItems: List<ElementAuthor>, exclude: Boolean) {
        throw UnsupportedOperationException("Unsupported element type 'author'.")
    }
}