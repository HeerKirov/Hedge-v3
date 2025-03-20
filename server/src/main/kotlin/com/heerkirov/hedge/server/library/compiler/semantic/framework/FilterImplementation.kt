package com.heerkirov.hedge.server.library.compiler.semantic.framework

import com.heerkirov.hedge.server.library.compiler.grammar.semantic.*
import com.heerkirov.hedge.server.library.compiler.semantic.*
import com.heerkirov.hedge.server.library.compiler.semantic.plan.*
import com.heerkirov.hedge.server.library.compiler.semantic.utils.AliasBuilder
import com.heerkirov.hedge.server.library.compiler.semantic.utils.buildAlias
import com.heerkirov.hedge.server.library.compiler.semantic.utils.semanticError

/**
 * 对关键字项进行标准解析的field。处理等价和集合运算。使用组合解析器指定对str的解析策略。
 */
class EquableField<V>(override val key: String, override val alias: Array<out String>, private val strTypeParser: StrTypeParser<V>) : FilterFieldByIdentify<V>() where V: EquableValue<*> {
    override fun generate(subject: StrList, family: Family?, predicative: Predicative?): EqualFilter<V>? {
        if(family == null || predicative == null) semanticError(FilterValueRequired(key, subject.beginIndex, subject.endIndex))

        return when (family.value) {
            ":" -> when(predicative) {
                is StrList -> processStrList(predicative)
                is Col -> processCol(predicative)
                is Range -> semanticError(UnsupportedFilterValueType(key, ValueType.RANGE, predicative.beginIndex, predicative.endIndex))
                is SortList -> semanticError(UnsupportedFilterValueType(key, ValueType.SORT_LIST, predicative.beginIndex, predicative.endIndex))
                else -> throw RuntimeException("Unsupported predicative ${predicative::class.simpleName}.")
            }
            ">", "<", ">=", "<=", "~", "~+", "~-" -> semanticError(UnsupportedFilterRelationSymbol(key, family.value, family.beginIndex, family.endIndex))
            else -> throw RuntimeException("Unsupported family symbol '${family.value}'.")
        }
    }

    override fun forecast(subject: StrList, family: Family?, predicative: Predicative?, cursorIndex: Int): Forecast? {
        return if(strTypeParser is EnumTypeParser<*> && predicative != null && cursorIndex >= predicative.beginIndex && cursorIndex <= predicative.endIndex) {
            when(predicative) {
                is StrList -> if(predicative.items.size == 1 && cursorIndex >= predicative.items.first().beginIndex && cursorIndex <= predicative.items.first().endIndex) {
                    ForecastFilter(predicative.items.first().value, key, strTypeParser.enums(), predicative.items.first().beginIndex, predicative.items.first().endIndex)
                }else{
                    null
                }
                is Col -> {
                    val item = predicative.items.firstOrNull { cursorIndex >= it.beginIndex && cursorIndex <= it.endIndex }
                    if(item != null) {
                        ForecastFilter(item.value, key, strTypeParser.enums(), item.beginIndex, item.endIndex)
                    }else{
                        null
                    }
                }
                else -> null
            }
        }else{
            null
        }
    }

    private fun processStrList(strList: StrList): EqualFilter<V> {
        if(strList.items.size > 1) semanticError(ValueCannotBeAddress(strList.beginIndex, strList.endIndex))
        val filterValue = strTypeParser.parse(strList.items.first())
        return EqualFilter(this, listOf(filterValue))
    }

    private fun processCol(col: Col): EqualFilter<V>? {
        if(col.items.isEmpty()) {
            //如果集合内没有项，就丢弃filter
            return null
        }
        val filterValues = col.items.asSequence().map { strTypeParser.parse(it) }.toList()
        return EqualFilter(this, filterValues)
    }
}

/**
 * 对关键字项进行标准解析的field。处理等价和集合运算，以及区间和比较运算。使用组合解析器指定对str的解析策略。
 */
class ComparableField<V>(override val key: String, override val alias: Array<out String>, private val nullable: Boolean, private val strTypeParser: StrTypeParser<V>) : FilterFieldByIdentify<V>() where V: ComparableValue<*>, V: EquableValue<*> {
    override fun generate(subject: StrList, family: Family?, predicative: Predicative?): Filter<V>? {
        if(family == null || predicative == null) {
            if(nullable && family == null && predicative == null) {
                return IsNullFilter(this, false)
            }else{
                semanticError(FilterValueRequired(key, subject.beginIndex, subject.endIndex))
            }
        }

        return when (family.value) {
            ":" -> when(predicative) {
                is StrList -> processStrList(predicative)
                is Col -> processCol(predicative)
                is Range -> processRange(predicative)
                is SortList -> semanticError(UnsupportedFilterValueType(key, ValueType.SORT_LIST, predicative.beginIndex, predicative.endIndex))
                else -> throw RuntimeException("Unsupported predicative ${predicative::class.simpleName}.")
            }
            ">", "<", ">=", "<=" -> when(predicative) {
                is StrList -> processStrListForCompare(predicative, family.value)
                is SortList -> semanticError(UnsupportedFilterValueType(key, ValueType.SORT_LIST, predicative.beginIndex, predicative.endIndex))
                is Col -> semanticError(UnsupportedFilterValueTypeOfRelation(key, ValueType.COLLECTION, family.value, predicative.beginIndex, predicative.endIndex))
                is Range -> semanticError(UnsupportedFilterValueTypeOfRelation(key, ValueType.RANGE, family.value, predicative.beginIndex, predicative.endIndex))
                else -> throw RuntimeException("Unsupported predicative ${predicative::class.simpleName}.")
            }
            "~", "~+", "~-" -> semanticError(UnsupportedFilterRelationSymbol(key, family.value, family.beginIndex, family.endIndex))
            else -> throw RuntimeException("Unsupported family symbol '${family.value}'.")
        }
    }

    override fun forecast(subject: StrList, family: Family?, predicative: Predicative?, cursorIndex: Int) = null

    private fun processStrList(strList: StrList): EqualFilter<V> {
        if(strList.items.size > 1) semanticError(ValueCannotBeAddress(strList.beginIndex, strList.endIndex))
        val filterValue = strTypeParser.parse(strList.items.first())
        return EqualFilter(this, listOf(filterValue))
    }

    private fun processStrListForCompare(strList: StrList, symbol: String): RangeFilter<V> {
        if(strList.items.size > 1) semanticError(ValueCannotBeAddress(strList.beginIndex, strList.endIndex))
        val filterValue = strTypeParser.parse(strList.items.first())
        return when (symbol) {
            ">" -> RangeFilter(this, filterValue, null, includeBegin = false, includeEnd = false)
            ">=" -> RangeFilter(this, filterValue, null, includeBegin = true, includeEnd = false)
            "<" -> RangeFilter(this, null, filterValue, includeBegin = false, includeEnd = false)
            "<=" -> RangeFilter(this, null, filterValue, includeBegin = false, includeEnd = true)
            else -> throw RuntimeException("Unsupported family symbol '${symbol}'.")
        }
    }

    private fun processCol(col: Col): EqualFilter<V>? {
        if(col.items.isEmpty()) {
            //如果集合内没有项，就丢弃filter
            return null
        }
        val filterValues = col.items.asSequence().map { strTypeParser.parse(it) }.toList()
        return EqualFilter(this, filterValues)
    }

    private fun processRange(range: Range): RangeFilter<V> {
        val beginValue = strTypeParser.parse(range.from)
        val endValue = strTypeParser.parse(range.to)
        return RangeFilter(this, beginValue, endValue, includeBegin = range.includeFrom, includeEnd = range.includeTo)
    }
}

/**
 * 对关键字项进行标准解析的field。处理等价和匹配运算。根据str的精确性信息区分两者。
 */
class MatchableField<V>(override val key: String, override val alias: Array<out String>, private val exact: Boolean, private val strTypeParser: StrTypeParser<V>) : FilterFieldByIdentify<V>(), GeneratedSequenceByIdentify<Filter<V>> where V: MatchableValue<*>, V: EquableValue<*> {
    override fun generateSeq(subject: StrList, family: Family?, predicative: Predicative?): Sequence<Filter<V>> {
        if(family == null || predicative == null) semanticError(FilterValueRequired(key, subject.beginIndex, subject.endIndex))

        return when (family.value) {
            ":" -> when(predicative) {
                is StrList -> sequenceOf(processStrList(predicative))
                is Col -> processCol(predicative)
                is Range -> semanticError(UnsupportedFilterValueType(key, ValueType.RANGE, predicative.beginIndex, predicative.endIndex))
                is SortList -> semanticError(UnsupportedFilterValueType(key, ValueType.SORT_LIST, predicative.beginIndex, predicative.endIndex))
                else -> throw RuntimeException("Unsupported predicative ${predicative::class.simpleName}.")
            }
            ">", "<", ">=", "<=", "~", "~+", "~-" -> semanticError(UnsupportedFilterRelationSymbol(key, family.value, family.beginIndex, family.endIndex))
            else -> throw RuntimeException("Unsupported family symbol '${family.value}'.")
        }
    }

    override fun forecast(subject: StrList, family: Family?, predicative: Predicative?, cursorIndex: Int) = null

    private fun processStrList(strList: StrList): Filter<V> {
        if(strList.items.size > 1) semanticError(ValueCannotBeAddress(strList.beginIndex, strList.endIndex))
        val filterValue = strTypeParser.parse(strList.items.first())
        return if(strList.items.first().type == Str.Type.BACKTICKS) {
            EqualFilter(this, listOf(filterValue))
        }else{
            MatchFilter(this, listOf(filterValue), exact = exact)
        }
    }

    private fun processCol(col: Col): Sequence<Filter<V>> {
        if(col.items.isEmpty()) {
            //如果集合内没有项，就丢弃filter
            return emptySequence()
        }
        val (precise, match) = col.items.asSequence().map { Pair(it.type == Str.Type.BACKTICKS, strTypeParser.parse(it)) }.partition { (precise, _) -> precise }
        val equalFilter = if(precise.isNotEmpty()) EqualFilter(this, precise.map { (_, s) -> s }) else null
        val matchFilter = if(match.isNotEmpty()) MatchFilter(this, match.map { (_, s) -> s }, exact = exact) else null
        return when {
            equalFilter != null && matchFilter != null -> sequenceOf(equalFilter, matchFilter)
            equalFilter != null -> sequenceOf(equalFilter)
            matchFilter != null -> sequenceOf(matchFilter)
            else -> emptySequence()
        }
    }
}

/**
 * flag型field，只要此关键字出现就产生判定。
 */
class FlagField(override val key: String, override val alias: Array<out String>) : FilterFieldByIdentify<FilterNothingValue>() {
    override fun generate(subject: StrList, family: Family?, predicative: Predicative?): FlagFilter {
        if(family != null || predicative != null) semanticError(FilterValueNotRequired(key, subject.beginIndex, predicative?.endIndex ?: family!!.endIndex))
        return FlagFilter(this)
    }

    override fun forecast(subject: StrList, family: Family?, predicative: Predicative?, cursorIndex: Int) = null
}

/**
 * 更复杂一些的标准解析field。使用复杂组合解析器指定对str的解析策略。
 * 复杂组合解析器能把str解析为单值Value或范围Range，这使状况处理变得更复杂了一些。
 */
class ComplexComparableField<V>(override val key: String, override val alias: Array<out String>, private val strComplexParser: StrComplexParser<V>) : FilterFieldByIdentify<V>(), GeneratedSequenceByIdentify<Filter<V>> where V: ComparableValue<*>, V: EquableValue<*> {
    override fun generateSeq(subject: StrList, family: Family?, predicative: Predicative?): Sequence<Filter<V>> {
        if(family == null || predicative == null) semanticError(FilterValueRequired(key, subject.beginIndex, subject.endIndex))

        return when (family.value) {
            ":" -> when(predicative) {
                is StrList -> processStrList(predicative)
                is Col -> processCol(predicative)
                is Range -> processRange(predicative)
                is SortList -> semanticError(UnsupportedFilterValueType(key, ValueType.SORT_LIST, predicative.beginIndex, predicative.endIndex))
                else -> throw RuntimeException("Unsupported predicative ${predicative::class.simpleName}.")
            }
            ">", "<", ">=", "<=" -> when(predicative) {
                is StrList -> processStrListForCompare(predicative, family.value)
                is Col -> semanticError(UnsupportedFilterValueTypeOfRelation(key, ValueType.COLLECTION, family.value, predicative.beginIndex, predicative.endIndex))
                is Range -> semanticError(UnsupportedFilterValueTypeOfRelation(key, ValueType.RANGE, family.value, predicative.beginIndex, predicative.endIndex))
                is SortList -> semanticError(UnsupportedFilterValueType(key, ValueType.SORT_LIST, predicative.beginIndex, predicative.endIndex))
                else -> throw RuntimeException("Unsupported predicative ${predicative::class.simpleName}.")
            }
            "~", "~+", "~-" -> semanticError(UnsupportedFilterRelationSymbol(key, family.value, family.beginIndex, family.endIndex))
            else -> throw RuntimeException("Unsupported family symbol '${family.value}'.")
        }
    }

    override fun forecast(subject: StrList, family: Family?, predicative: Predicative?, cursorIndex: Int) = null

    private fun processStrList(strList: StrList): Sequence<Filter<V>> {
        if(strList.items.size > 1) semanticError(ValueCannotBeAddress(strList.beginIndex, strList.endIndex))
        return sequenceOf(when (val result = strComplexParser.parse(strList.items.first())) {
            is StrComplexValue<*> -> EqualFilter(this, listOf((result as StrComplexValue<V>).value))
            is StrComplexRange<*> -> {
                val range = result as StrComplexRange<V>
                RangeFilter(this, range.begin, range.end, includeBegin = true, includeEnd = false)
            }
        })
    }

    private fun processCol(col: Col): Sequence<Filter<V>> {
        if(col.items.isEmpty()) {
            //如果集合内没有项，就丢弃filter
            return emptySequence()
        }
        val results = col.items.asSequence().map { strComplexParser.parse(it) }.toList()
        return results.filterIsInstance<StrComplexValue<V>>().map { it.value }.let { sequenceOf(EqualFilter(this, it)) } +
               results.filterIsInstance<StrComplexRange<V>>().map { RangeFilter(this, it.begin, it.end, includeBegin = true, includeEnd = false) }.asSequence()
    }

    private fun processRange(range: Range): Sequence<Filter<V>> {
        val beginValue: V
        val endValue: V
        val includeBegin: Boolean
        val includeEnd: Boolean

        when(val from = strComplexParser.parse(range.from)) {
            is StrComplexValue<*> -> {
                beginValue = (from as StrComplexValue<V>).value
                includeBegin = range.includeFrom
            }
            is StrComplexRange<*> -> if(range.includeFrom) {
                beginValue = (from as StrComplexRange<V>).begin
                includeBegin = true
            }else{
                beginValue = (from as StrComplexRange<V>).end
                includeBegin = true
            }
        }

        when(val to = strComplexParser.parse(range.to)) {
            is StrComplexValue<*> -> {
                endValue = (to as StrComplexValue<V>).value
                includeEnd = range.includeTo
            }
            is StrComplexRange<*> -> if(range.includeTo) {
                endValue = (to as StrComplexRange<V>).end
                includeEnd = false
            }else{
                endValue = (to as StrComplexRange<V>).begin
                includeEnd = false
            }
        }

        return sequenceOf(RangeFilter(this, beginValue, endValue, includeBegin, includeEnd))
    }

    private fun processStrListForCompare(strList: StrList, symbol: String): Sequence<Filter<V>> {
        if(strList.items.size > 1) semanticError(ValueCannotBeAddress(strList.beginIndex, strList.endIndex))
        when (val result = strComplexParser.parse(strList.items.first())) {
            is StrComplexValue<*> -> {
                val filterValue = (result as StrComplexValue<V>).value
                val filter = when (symbol) {
                    ">" -> RangeFilter(this, filterValue, null, includeBegin = false, includeEnd = false)
                    ">=" -> RangeFilter(this, filterValue, null, includeBegin = true, includeEnd = false)
                    "<" -> RangeFilter(this, null, filterValue, includeBegin = false, includeEnd = false)
                    "<=" -> RangeFilter(this, null, filterValue, includeBegin = false, includeEnd = true)
                    else -> throw RuntimeException("Unsupported family symbol '$symbol'.")
                }
                return sequenceOf(filter)
            }
            is StrComplexRange<*> -> {
                val beginValue = (result as StrComplexRange<V>).begin
                val endValue = result.end
                val filter = when (symbol) {
                    ">" -> RangeFilter(this, endValue, null, includeBegin = true, includeEnd = false)
                    ">=" -> RangeFilter(this, beginValue, null, includeBegin = true, includeEnd = false)
                    "<" -> RangeFilter(this, null, beginValue, includeBegin = false, includeEnd = false)
                    "<=" -> RangeFilter(this, null, endValue, includeBegin = false, includeEnd = false)
                    else -> throw RuntimeException("Unsupported family symbol '$symbol'.")
                }
                return sequenceOf(filter)
            }
        }
    }
}

/**
 * 专门用于处理number pattern类型的解析器。
 */
class NumberPatternField(override val key: String, override val alias: Array<out String>) : FilterFieldByIdentify<FilterPatternNumberValue>(), GeneratedSequenceByIdentify<Filter<FilterPatternNumberValue>> {
    override fun generateSeq(subject: StrList, family: Family?, predicative: Predicative?): Sequence<Filter<FilterPatternNumberValue>> {
        if(family == null || predicative == null) semanticError(FilterValueRequired(key, subject.beginIndex, subject.endIndex))

        return when (family.value) {
            ":" -> when(predicative) {
                is StrList -> processStrList(predicative)
                is Col -> processCol(predicative)
                is Range -> processRange(predicative)
                is SortList -> semanticError(UnsupportedFilterValueType(key, ValueType.SORT_LIST, predicative.beginIndex, predicative.endIndex))
                else -> throw RuntimeException("Unsupported predicative ${predicative::class.simpleName}.")
            }
            ">", "<", ">=", "<=" -> when(predicative) {
                is StrList -> processStrListForCompare(predicative, family.value)
                is SortList -> semanticError(UnsupportedFilterValueType(key, ValueType.SORT_LIST, predicative.beginIndex, predicative.endIndex))
                is Col -> semanticError(UnsupportedFilterValueTypeOfRelation(key, ValueType.COLLECTION, family.value, predicative.beginIndex, predicative.endIndex))
                is Range -> semanticError(UnsupportedFilterValueTypeOfRelation(key, ValueType.RANGE, family.value, predicative.beginIndex, predicative.endIndex))
                else -> throw RuntimeException("Unsupported predicative ${predicative::class.simpleName}.")
            }
            "~", "~+", "~-" -> semanticError(UnsupportedFilterRelationSymbol(key, family.value, family.beginIndex, family.endIndex))
            else -> throw RuntimeException("Unsupported family symbol '${family.value}'.")
        }
    }

    override fun forecast(subject: StrList, family: Family?, predicative: Predicative?, cursorIndex: Int) = null

    private fun processStrList(strList: StrList): Sequence<Filter<FilterPatternNumberValue>> {
        if(strList.items.size > 1) semanticError(ValueCannotBeAddress(strList.beginIndex, strList.endIndex))
        return sequenceOf(when (val result = PatternNumberParser.parse(strList.items.first())) {
            is StrComplexValue<*> -> {
                val value = (result as StrComplexValue<FilterPatternNumberValue>).value
                if(value.isPattern()) MatchFilter(this, listOf(value), exact = true)
                else EqualFilter(this, listOf(value))
            }
            is StrComplexRange<*> -> {
                val range = result as StrComplexRange<FilterPatternNumberValue>
                RangeFilter(this, range.begin, range.end, includeBegin = true, includeEnd = false)
            }
        })
    }

    private fun processStrListForCompare(strList: StrList, symbol: String): Sequence<Filter<FilterPatternNumberValue>> {
        if(strList.items.size > 1) semanticError(ValueCannotBeAddress(strList.beginIndex, strList.endIndex))
        val filterValue = parseRangeFilterValue(strList.items.first())
        if(filterValue.isPattern()) semanticError(ValueCannotBePatternInComparison(strList.beginIndex, strList.endIndex))
        val filter = when (symbol) {
            ">" -> RangeFilter(this, filterValue, null, includeBegin = false, includeEnd = false)
            ">=" -> RangeFilter(this, filterValue, null, includeBegin = true, includeEnd = false)
            "<" -> RangeFilter(this, null, filterValue, includeBegin = false, includeEnd = false)
            "<=" -> RangeFilter(this, null, filterValue, includeBegin = false, includeEnd = true)
            else -> throw RuntimeException("Unsupported family symbol '${symbol}'.")
        }
        return sequenceOf(filter)
    }

    private fun processCol(col: Col): Sequence<Filter<FilterPatternNumberValue>> {
        if(col.items.isEmpty()) {
            //如果集合内没有项，就丢弃filter
            return emptySequence()
        }
        val results = col.items.asSequence().map { PatternNumberParser.parse(it) }.toList()
        return results.filterIsInstance<StrComplexValue<FilterPatternNumberValue>>().map { it.value }.let {
            val (matchItems, equalItems) = it.partition { v -> v.isPattern() }
            sequence {
                if(equalItems.isNotEmpty()) yield(EqualFilter(this@NumberPatternField, equalItems))
                if(matchItems.isNotEmpty()) yield(MatchFilter(this@NumberPatternField, matchItems, exact = true))
            }
        } + results.filterIsInstance<StrComplexRange<FilterPatternNumberValue>>().map { RangeFilter(this, it.begin, it.end, includeBegin = true, includeEnd = false) }.asSequence()
    }

    private fun processRange(range: Range): Sequence<Filter<FilterPatternNumberValue>> {
        val beginValue = parseRangeFilterValue(range.from)
        val endValue = parseRangeFilterValue(range.to)
        return sequenceOf(RangeFilter(this, beginValue, endValue, includeBegin = range.includeFrom, includeEnd = range.includeTo))
    }

    private fun parseRangeFilterValue(str: Str): FilterPatternNumberValue {
        return when (val result = PatternNumberParser.parse(str)) {
            is StrComplexRange<*> -> semanticError(ValueCannotBePatternInComparison(str.beginIndex, str.endIndex))
            is StrComplexValue<*> -> (result as StrComplexValue<FilterPatternNumberValue>).value.also {
                if(it.isPattern()) semanticError(ValueCannotBePatternInComparison(str.beginIndex, str.endIndex))
            }
        }
    }
}

/**
 * 一种更加复杂的Enum Equable类型，它的最终值将作为collection整体生成。
 */
class CompositionField<V>(override val key: String, override val alias: Array<out String>, private val allowFlagMode: Boolean, private val strTypeParser: StrTypeParser<V>) : FilterFieldByIdentify<V>() where V: EquableValue<*> {
    override fun generate(subject: StrList, family: Family?, predicative: Predicative?): CompositionFilter<V>? {
        if(family == null && predicative == null) {
            if(allowFlagMode) {
                //开启allowFlagMode后，可以忽略关系和值，从而只获得一个空集合
                return CompositionFilter(this, emptyList())
            }else{
                semanticError(FilterValueRequired(key, subject.beginIndex, subject.endIndex))
            }
        }else if(family == null || predicative == null) {
            semanticError(FilterValueRequired(key, subject.beginIndex, predicative?.endIndex ?: family?.endIndex ?: subject.endIndex))
        }

        return when (family.value) {
            ":" -> when(predicative) {
                is StrList -> processStrList(predicative)
                is Col -> processCol(predicative)
                is Range -> semanticError(UnsupportedFilterValueType(key, ValueType.RANGE, predicative.beginIndex, predicative.endIndex))
                is SortList -> semanticError(UnsupportedFilterValueType(key, ValueType.SORT_LIST, predicative.beginIndex, predicative.endIndex))
                else -> throw RuntimeException("Unsupported predicative ${predicative::class.simpleName}.")
            }
            ">", "<", ">=", "<=", "~", "~+", "~-" -> semanticError(UnsupportedFilterRelationSymbol(key, family.value, family.beginIndex, family.endIndex))
            else -> throw RuntimeException("Unsupported family symbol '${family.value}'.")
        }
    }

    override fun forecast(subject: StrList, family: Family?, predicative: Predicative?, cursorIndex: Int): Forecast? {
        return if(strTypeParser is EnumTypeParser<*> && predicative != null && cursorIndex >= predicative.beginIndex && cursorIndex <= predicative.endIndex) {
            when(predicative) {
                is StrList -> if(predicative.items.size == 1 && cursorIndex >= predicative.items.first().beginIndex && cursorIndex <= predicative.items.first().endIndex) {
                    ForecastFilter(predicative.items.first().value, key, strTypeParser.enums(), predicative.items.first().beginIndex, predicative.items.first().endIndex)
                }else{
                    null
                }
                is Col -> {
                    val item = predicative.items.firstOrNull { cursorIndex >= it.beginIndex && cursorIndex <= it.endIndex }
                    if(item != null) {
                        ForecastFilter(item.value, key, strTypeParser.enums(), item.beginIndex, item.endIndex)
                    }else{
                        null
                    }
                }
                else -> null
            }
        }else{
            null
        }
    }

    private fun processStrList(strList: StrList): CompositionFilter<V> {
        if(strList.items.size > 1) semanticError(ValueCannotBeAddress(strList.beginIndex, strList.endIndex))
        val filterValue = strTypeParser.parse(strList.items.first())
        return CompositionFilter(this, listOf(filterValue))
    }

    private fun processCol(col: Col): CompositionFilter<V>? {
        if(col.items.isEmpty()) {
            //如果集合内没有项，就丢弃filter
            return null
        }
        val filterValues = col.items.asSequence().map { strTypeParser.parse(it) }.toList()
        return CompositionFilter(this, filterValues)
    }
}

/**
 * 数值型关键字项。
 */
fun numberField(key: String, vararg alias: String, timesValue: Boolean = false, nullable: Boolean = false): FilterFieldDefinition<FilterNumberValue> = ComparableField(key, alias, nullable, if(timesValue) TimesNumberParser else NumberParser)

/**
 * 数值且可匹配的关键字项。
 */
fun patternNumberField(key: String, vararg alias: String): FilterFieldDefinition<FilterPatternNumberValue> = NumberPatternField(key, alias)

/**
 * 比值型关键字项。
 */
fun ratioField(key: String, vararg alias: String): FilterFieldDefinition<FilterFloatNumberValue> = ComparableField(key, alias, false, RatioParser)

/**
 * 日期型关键字项。
 */
fun dateField(key: String, vararg alias: String): FilterFieldDefinition<FilterDateValue> = ComplexComparableField(key, alias, DateParser)

/**
 * 日期时间型关键字项。表面上能写的都是日期，但这个是按照DATETIME类型的需要来翻译日期值的。
 */
fun datetimeField(key: String, vararg alias: String): FilterFieldDefinition<FilterDateValue> = ComplexComparableField(key, alias, DateTimeParser)

/**
 * 带有byte单位的大小类型关键字项。
 */
fun byteSizeField(key: String, vararg alias: String): FilterFieldDefinition<FilterSizeValue> = ComparableField(key, alias, false, ByteSizeParser)

/**
 * 带有duration单位的大小类型关键字项。
 */
fun durationSizeField(key: String, vararg alias: String): FilterFieldDefinition<FilterSizeValue> = ComparableField(key, alias, false, DurationSizeParser)

/**
 * 字符串型关键字项，对精确的字符串进行等价判断，非精确字符串模糊匹配。
 */
fun patternStringField(key: String, vararg alias: String, exact: Boolean = false): FilterFieldDefinition<FilterStringValue> = MatchableField(key, alias, exact, StringParser)

/**
 * 字符串型关键字项，对所有字符串进行等价判断。
 */
fun stringField(key: String, vararg alias: String): FilterFieldDefinition<FilterStringValue> = EquableField(key, alias, StringParser)

/**
 * 标记型关键字项。
 */
fun flagField(key: String, vararg alias: String): FilterFieldDefinition<FilterNothingValue> = FlagField(key, alias)

/**
 * 枚举型关键字项。
 */
inline fun <reified E : Enum<E>> enumField(key: String, vararg alias: String, block: AliasBuilder<E, String>.() -> Unit): FilterFieldDefinition<FilterEnumValue<E>> = EquableField(key, alias, EnumParser(E::class, buildAlias(block)))

/**
 * 枚举型composition关键字项。
 */
inline fun compositionField(key: String, vararg alias: String, allowFlagMode: Boolean = false, block: AliasBuilder<String, String>.() -> Unit): FilterFieldDefinition<FilterStringValue> = CompositionField(key, alias, allowFlagMode, StringEnumParser(key, buildAlias(block)))