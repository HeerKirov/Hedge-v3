package com.heerkirov.hedge.server.library.compiler.translator

import com.heerkirov.hedge.server.library.compiler.semantic.plan.*
import com.heerkirov.hedge.server.library.compiler.translator.visual.*
import com.heerkirov.hedge.server.library.compiler.translator.visual.Element
import com.heerkirov.hedge.server.library.compiler.utils.AnalysisResult
import com.heerkirov.hedge.server.library.compiler.utils.ErrorCollector
import com.heerkirov.hedge.server.library.compiler.utils.TranslatorError

/**
 * 执行计划翻译器。执行查询计划 -> 执行计划 & 可视化查询计划的过程。
 */
object Translator {
    /**
     * 执行翻译。
     * @param queryPlan 输入参数，查询计划。
     * @param queryer 执行预查询和中间代换。
     * @param executeBuilder 构建伴生的执行计划。
     * @param options 翻译器选项。
     */
    fun parse(queryPlan: QueryPlan, queryer: Queryer, executeBuilder: ExecuteBuilder, options: TranslatorOptions? = null): AnalysisResult<VisualQueryPlan, TranslatorError<*>> {
        val collector = ErrorCollector<TranslatorError<*>>()

        //翻译sort部分
        val visualSortList = queryPlan.sorts.map(::mapSortItem)
        if(queryPlan.sorts.isNotEmpty()) executeBuilder.mapSorts(queryPlan.sorts)

        //翻译filter部分
        val visualFilters = queryPlan.filters.map { unionFilters ->
            executeBuilder.mapFilter(unionFilters, unionFilters.exclude)
            FilterItem(exclude = unionFilters.exclude, fields = unionFilters.groupBy { it.field }.map { (field, filters) ->
                FilterOfOneField(field.key, filters.flatMap { filter ->
                    when (filter) {
                        is EqualFilter -> (filter as EqualFilter<*>).values.map { FilterEqual(it.equalValue) }
                        is CompositionFilter -> (filter as CompositionFilter<*>).values.map { FilterEqual(it.equalValue) }
                        is MatchFilter -> (filter as MatchFilter<*>).values.map { FilterMatch(it.matchValue) }
                        is RangeFilter -> (filter as RangeFilter<*>).let { listOf(FilterRange(it.begin?.compareValue, it.end?.compareValue, it.includeBegin, it.includeEnd)) }
                        is FlagFilter, is IsNullFilter -> emptyList()
                        else -> throw RuntimeException("Unsupported filter type ${filter::class.simpleName}.")
                    }
                })
            })
        }

        //翻译element部分
        var joinDepth = 0
        val visualElements = queryPlan.elements.groupBy {
            when (it) {
                is NameElementForMeta -> "name"
                is CommentElementForMeta -> "description"
                is TagElement -> "meta-tag"
                is SourceTagElement -> "source-tag"
                else -> throw RuntimeException("Unsupported element type ${it::class.simpleName}.")
            }
        }.map { (type, elements) ->
            Element(type, elements.map { element ->
                ElementItem(element.exclude, when (element) {
                    is NameElementForMeta -> element.items.map { ElementString(it.value, it.precise) }.also { executeBuilder.mapNameElement(it, element.exclude) }
                    is CommentElementForMeta -> element.items.map { ElementString(it.value, it.precise) }.also { joinDepth += 1 }.also { executeBuilder.mapCommentElement(it, element.exclude) }
                    is SourceTagElement -> mapSourceTagElement(element, queryer, collector, options).also { joinDepth += 1 }.also { executeBuilder.mapSourceTagElement(it, element.exclude) }
                    is TagElement -> {
                        val (r, t) = mapTagElement(element, queryer, collector, options)
                        @Suppress("UNCHECKED_CAST")
                        when(t) {
                            "tag" -> executeBuilder.mapTagElement(r as List<ElementTag>, element.exclude)
                            "author" -> executeBuilder.mapAuthorElement(r as List<ElementAuthor>, element.exclude)
                            "topic" -> executeBuilder.mapTopicElement(r as List<ElementTopic>, element.exclude)
                        }
                        joinDepth += 1
                        r
                    }
                    else -> throw RuntimeException("Unsupported element type $type.")
                })
            })
        }
        if(options != null && joinDepth >= options.warningLimitOfIntersectItems) collector.warning(NumberOfIntersectItemExceed(options.warningLimitOfIntersectItems))

        return if(collector.hasErrors) {
            AnalysisResult(null, warnings = collector.warnings, errors = collector.errors)
        }else{
            AnalysisResult(VisualQueryPlan(visualSortList, visualElements, visualFilters), warnings = collector.warnings)
        }
    }

    /**
     * 执行预测。
     */
    fun forecast(forecast: Forecast, queryer: Queryer): VisualForecast {
        return when(forecast) {
            is ForecastFilter -> {
                val suggestions = forecast.enums.filter { item -> item.any { it.contains(forecast.item, ignoreCase = true) } }.map { VisualForecastSuggestion(it.first(), if(it.size > 1) it.subList(1, it.size) else emptyList(), emptyList()) }
                VisualForecast("filter", forecast.item, suggestions, forecast.beginIndex, forecast.endIndex, forecast.fieldName)
            }
            is ForecastSort -> {
                val suggestions = forecast.enums.filter { item -> item.any { it.contains(forecast.item, ignoreCase = true) } }.map { VisualForecastSuggestion(it.first(), if(it.size > 1) it.subList(1, it.size) else emptyList(), emptyList()) }
                VisualForecast("sort", forecast.item, suggestions, forecast.beginIndex, forecast.endIndex)
            }
            is ForecastMetaTagElement -> {
                val suggestions = when(forecast.type) {
                    "tag" -> queryer.forecastTag(forecast.address).map { VisualForecastSuggestion(it.name, it.otherNames, emptyList()) }
                    "topic" -> queryer.forecastTopic(forecast.address).map { VisualForecastSuggestion(it.name, it.otherNames, listOfNotNull(it.parentRoot?.name)) }
                    "author" -> queryer.forecastAuthor(forecast.address).map { VisualForecastSuggestion(it.name, it.otherNames, emptyList()) }
                    else -> throw UnsupportedOperationException("Unsupported type ${forecast.type}.")
                }
                VisualForecast(forecast.type, forecast.address.last().value, suggestions, forecast.beginIndex, forecast.endIndex)
            }
            is ForecastSourceTagElement -> {
                val suggestions = queryer.forecastSourceTag(forecast.items).map { VisualForecastSuggestion(it.name, if(it.code != it.name || it.otherName != null) { listOfNotNull(if(it.code != it.name) it.code else null, it.otherName) } else emptyList(), listOf(it.site)) }
                VisualForecast("source-tag", forecast.items.last().value, suggestions, forecast.beginIndex, forecast.endIndex)
            }
            is ForecastKeywordElement -> {
                val suggestions = queryer.forecastKeyword(forecast.item, forecast.metaType).map { VisualForecastSuggestion(it, emptyList(), emptyList()) }
                VisualForecast("keyword", forecast.item.value, suggestions, forecast.beginIndex, forecast.endIndex)
            }
        }
    }

    /**
     * 处理一个TagElement的翻译。
     */
    private fun mapTagElement(element: TagElement<*>, queryer: Queryer, collector: ErrorCollector<TranslatorError<*>>, options: TranslatorOptions?): Pair<List<ElementMeta>, String> {
        return (if(element.metaType == null) {
            //未标记类型时，按tag->topic->author的顺序，依次进行搜索。由于整个合取项的类型统一，一旦某种类型找到了至少1个结果，就从这个类型返回
            val tagCollector = ErrorCollector<TranslatorError<*>>()
            val tagResult = element.items.flatMap { queryer.findTag(it, tagCollector) }.let { queryer.flatUnionTag(it) }
            if(tagResult.isNotEmpty() || element !is TopicElement<*>) {
                collector.collect(tagCollector)
                tagResult to "tag"
            }else{
                val topicCollector = ErrorCollector<TranslatorError<*>>()
                val topicResult = element.items.flatMap { queryer.findTopic(it, topicCollector) }.let { queryer.flatUnionTopic(it) }
                if(topicResult.isNotEmpty() || element !is AuthorElement) {
                    collector.collect(topicCollector)
                    topicResult to "topic"
                }else{
                    val authorCollector = ErrorCollector<TranslatorError<*>>()
                    val authorResult = element.items.flatMap { queryer.findAuthor(it, authorCollector) }
                    collector.collect(authorCollector)
                    authorResult to "author"
                }
            }
        }else when (element.metaType) {
            //标记了类型时，按author->topic->tag的顺序，确定实际的类型是什么，然后根据单一类型确定查询结果
            MetaType.AUTHOR -> (element as AuthorElement).items.flatMap { queryer.findAuthor(it, collector) } to "author"
            MetaType.TOPIC -> (element as TopicElement<*>).items.flatMap { queryer.findTopic(it, collector) }.let { queryer.flatUnionTopic(it) } to "topic"
            MetaType.TAG -> element.items.flatMap { queryer.findTag(it, collector) }.let { queryer.flatUnionTag(it) } to "tag"
        }).also { (result, _) ->
            if(result.isEmpty()) collector.warning(WholeElementMatchesNone(element.items.map { it.revertToQueryString() }))
            else if(options!= null && result.size >= options.warningLimitOfUnionItems) collector.warning(NumberOfUnionItemExceed(element.items.map { it.revertToQueryString() }, options.warningLimitOfUnionItems))
        }
    }

    /**
     * 处理一个SourceTagElement的翻译。
     */
    private fun mapSourceTagElement(element: SourceTagElement, queryer: Queryer, collector: ErrorCollector<TranslatorError<*>>, options: TranslatorOptions?): List<ElementSourceTag> {
        return element.items.flatMap { queryer.findSourceTag(it, collector) }.also { result ->
            if(result.isEmpty()) collector.warning(WholeElementMatchesNone(element.items.map { it.revertToQueryString() }))
            else if(options!= null && result.size >= options.warningLimitOfUnionItems) collector.warning(NumberOfUnionItemExceed(element.items.map { it.revertToQueryString() }, options.warningLimitOfUnionItems))
        }
    }

    /**
     * 将一个semantic sort项翻译为可视化项。
     */
    private fun mapSortItem(sort: Sort<*>): String {
        return "${if(sort.isAscending()) "+" else "-"}${sort.value}"
    }
}