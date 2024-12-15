package com.heerkirov.hedge.server.library.compiler.translator

import com.heerkirov.hedge.server.library.compiler.semantic.plan.*
import com.heerkirov.hedge.server.library.compiler.translator.visual.*
import com.heerkirov.hedge.server.library.compiler.utils.ErrorCollector
import com.heerkirov.hedge.server.library.compiler.utils.TranslatorError

/**
 * 预查询翻译器接口。
 */
interface Queryer {
    fun findTag(metaValue: MetaValue, collector: ErrorCollector<TranslatorError<*>>): List<ElementTag>

    fun findTopic(metaValue: SimpleMetaValue, collector: ErrorCollector<TranslatorError<*>>): List<ElementTopic>

    fun findAuthor(metaValue: SingleMetaValue, collector: ErrorCollector<TranslatorError<*>>): List<ElementAuthor>

    fun findSourceTag(metaString: SimpleMetaValue, collector: ErrorCollector<TranslatorError<*>>): List<ElementSourceTag>

    fun flatUnionTag(tags: List<ElementTag>): List<ElementTag> = tags

    fun flatUnionTopic(topics: List<ElementTopic>): List<ElementTopic> = topics

    fun forecastTag(metaAddress: MetaAddress): List<ElementTag>

    fun forecastTopic(metaAddress: MetaAddress): List<ElementTopic>

    fun forecastAuthor(metaAddress: MetaAddress): List<ElementAuthor>

    fun forecastKeyword(metaString: MetaString, metaType: MetaType): List<String>

    fun forecastSourceTag(metaAddress: MetaAddress): List<ElementSourceTag>
}