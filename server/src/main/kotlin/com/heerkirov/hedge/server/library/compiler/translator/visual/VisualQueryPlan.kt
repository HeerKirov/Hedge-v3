package com.heerkirov.hedge.server.library.compiler.translator.visual

import com.heerkirov.hedge.server.enums.TagAddressType
import com.heerkirov.hedge.server.enums.TagAuthorType
import com.heerkirov.hedge.server.enums.TagTopicType

data class VisualQueryPlan(
    val sorts: List<String>,
    val elements: List<Element<*>>,
    val filters: List<FilterItem>
)


data class FilterItem(val exclude: Boolean, val fields: List<FilterOfOneField<*>>)

data class FilterOfOneField<V : Any>(val name: String, val values: List<FilterValue<V>>)

interface FilterValue<V : Any> {
    val type: String
}

data class FilterEqual<V : Any>(val value: V) : FilterValue<V> {
    override val type: String get() = "equal"
}

data class FilterMatch<V : Any>(val value: V): FilterValue<V> {
    override val type: String get() = "match"
}

data class FilterRange<V : Any>(val begin: V?, val end: V?, val includeBegin: Boolean, val includeEnd: Boolean) : FilterValue<V> {
    override val type: String get() = "range"
}


data class Element<V : ElementValue>(val type: String, val intersectItems: List<ElementItem<V>>)

open class ElementItem<V : ElementValue>(val exclude: Boolean, val unionItems: List<V>) {
    override fun equals(other: Any?): Boolean {
        return other === this || (other is ElementItem<*> && other.exclude == exclude && other.unionItems == unionItems)
    }

    override fun hashCode(): Int {
        return exclude.hashCode() * 31 + unionItems.hashCode()
    }

    override fun toString(): String {
        return "ElementItem(exclude=$exclude, unionItems=$unionItems)"
    }
}

interface ElementValue

data class ElementString(val value: String, val precise: Boolean) : ElementValue

sealed interface ElementMeta : ElementValue {
    val type: String
    val id: Int
    val name: String
}

data class ElementSourceTag(override val id: Int, val site: String, val sourceTagType: String, override val name: String, val code: String, val otherName: String?) : ElementMeta {
    override val type: String get() = "source-tag"
}

data class ElementTopic(override val id: Int, override val name: String, val otherNames: List<String>, val tagType: TagTopicType, val color: String?, val parentRoot: ParentRootTopic?) : ElementMeta {
    override val type: String get() = "topic"

    data class ParentRootTopic(val id: Int, val name: String, val tagType: TagTopicType)
}

data class ElementAuthor(override val id: Int, override val name: String, val otherNames: List<String>, val tagType: TagAuthorType, val color: String?) : ElementMeta {
    override val type: String get() = "author"
}

data class ElementTag(override val id: Int, override val name: String, val otherNames: List<String>, val tagType: TagAddressType, val color: String?, val realTags: List<RealTag>?) : ElementMeta {
    override val type: String get() = "tag"

    data class RealTag(val id: Int, val name: String, val tagType: TagAddressType)
}