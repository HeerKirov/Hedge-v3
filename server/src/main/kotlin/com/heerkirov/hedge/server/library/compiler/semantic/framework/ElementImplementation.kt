package com.heerkirov.hedge.server.library.compiler.semantic.framework

import com.heerkirov.hedge.server.library.compiler.grammar.semantic.*
import com.heerkirov.hedge.server.library.compiler.grammar.semantic.Annotation
import com.heerkirov.hedge.server.library.compiler.semantic.*
import com.heerkirov.hedge.server.library.compiler.semantic.plan.Forecast
import com.heerkirov.hedge.server.library.compiler.semantic.plan.ForecastAnnotationElement
import com.heerkirov.hedge.server.library.compiler.semantic.plan.ForecastMetaTagElement
import com.heerkirov.hedge.server.library.compiler.semantic.plan.ForecastSourceTagElement
import com.heerkirov.hedge.server.library.compiler.semantic.plan.*
import com.heerkirov.hedge.server.library.compiler.semantic.utils.semanticError
import com.heerkirov.hedge.server.library.compiler.grammar.semantic.Element as SemanticElement

/**
 * 从element生成meta tag的生成器。被使用在illust/book中。
 */
object MetaTagElementField : ElementFieldByElement() {
    override val itemName = "meta-tag"
    override val forSourceFlag = false

    override fun generate(element: SemanticElement, minus: Boolean): TagElement<*> {
        //首先将element的各个子项按照最小类原则转换为MetaValue或其子类
        val metaValues = element.items.map(::mapSfpToMetaValue)
        val metaType = if(element.prefix == null) null else when (element.prefix.value) {
            "@" -> MetaType.AUTHOR
            "#" -> MetaType.TOPIC
            "$" -> MetaType.TAG
            else -> throw RuntimeException("Unsupported element prefix ${element.prefix.value}.")
        }
        //然后根据公共最小类决定实例化的类型
        val tagElement = when {
            metaValues.all { it is SingleMetaValue } -> {
                @Suppress("UNCHECKED_CAST")
                AuthorElementImpl(metaValues as List<SingleMetaValue>, metaType, minus)
            }
            metaValues.all { it is SimpleMetaValue } -> {
                @Suppress("UNCHECKED_CAST")
                TopicElementImpl(metaValues as List<SimpleMetaValue>, metaType, minus)
            }
            else -> TagElementImpl(metaValues, metaType, minus)
        }
        //如果指定了prefix，检验实例化类型是否满足prefix的要求
        if(metaType != null) {
            when (metaType) {
                MetaType.AUTHOR -> if(tagElement !is AuthorElement) semanticError(InvalidMetaTagForThisPrefix("@", element.beginIndex, element.endIndex))
                MetaType.TOPIC -> if(tagElement !is TopicElement) semanticError(InvalidMetaTagForThisPrefix("#", element.beginIndex, element.endIndex))
                MetaType.TAG -> {/*tag类型总是会被满足要求*/}
            }
        }
        return tagElement
    }

    override fun forecast(element: SemanticElement, minus: Boolean, cursorIndex: Int): Forecast? {
        val (subject, _, predicative) = element.items.firstOrNull { cursorIndex >= it.beginIndex && cursorIndex <= it.endIndex } ?: return null
        if(subject !is StrList) return null
        //仅当显式标识了prefix时，预测才会生效
        val metaType = when (element.prefix?.value ?: return null) {
            "@" -> MetaType.AUTHOR
            "#" -> MetaType.TOPIC
            "$" -> MetaType.TAG
            else -> throw RuntimeException("Unsupported element prefix ${element.prefix.value}.")
        }
        return if(cursorIndex >= subject.beginIndex && cursorIndex <= subject.endIndex) {
            val idx = subject.items.indexOfFirst { cursorIndex >= it.beginIndex && cursorIndex <= it.endIndex }
            if(idx < 0) null else ForecastMetaTagElement(subject.items.subList(0, idx + 1).map(::mapStrToMetaString), metaType.name.lowercase(), subject.items[idx].beginIndex, subject.items[idx].endIndex)
        }else if(predicative != null && cursorIndex >= predicative.beginIndex && cursorIndex <= predicative.endIndex) {
            val subjectAddress = subject.items.map(::mapStrToMetaString)
            when(predicative) {
                is StrList -> {
                    val item = predicative.items.firstOrNull { cursorIndex >= it.beginIndex && cursorIndex <= it.endIndex } ?: return null
                    ForecastMetaTagElement(subjectAddress + mapStrToMetaString(item), metaType.name.lowercase(), item.beginIndex, item.endIndex)
                }
                is Range -> if(cursorIndex >= predicative.from.beginIndex && cursorIndex <= predicative.from.endIndex) {
                    ForecastMetaTagElement(subjectAddress + mapStrToMetaString(predicative.from), metaType.name.lowercase(), predicative.from.beginIndex, predicative.from.endIndex)
                }else if(cursorIndex >= predicative.to.beginIndex && cursorIndex <= predicative.to.endIndex) {
                    ForecastMetaTagElement(subjectAddress + mapStrToMetaString(predicative.to), metaType.name.lowercase(), predicative.to.beginIndex, predicative.to.endIndex)
                }else{
                    null
                }
                is Col -> {
                    val item = predicative.items.firstOrNull { cursorIndex >= it.beginIndex && cursorIndex <= it.endIndex } ?: return null
                    ForecastMetaTagElement(subjectAddress + mapStrToMetaString(item), metaType.name.lowercase(), item.beginIndex, item.endIndex)
                }
                else -> null
            }
        }else{
            null
        }
    }

    /**
     * 将主系表结构转换为对应的MetaValue。
     */
    private fun mapSfpToMetaValue(sfp: SFP): MetaValue {
        val (subject, family, predicative) = sfp
        val metaAddress = mapSubjectToMetaAddress(subject)

        return if(family != null && predicative != null) {
            //同时具有主系表结构
            when (family.value) {
                ":" -> mapIsFamily(metaAddress, predicative)
                ">" -> mapCompareFamily(metaAddress, family.value, predicative)
                ">=" -> mapCompareFamily(metaAddress, family.value, predicative)
                "<" -> mapCompareFamily(metaAddress, family.value, predicative)
                "<=" -> mapCompareFamily(metaAddress, family.value, predicative)
                "~" -> mapToFamily(metaAddress, predicative)
                else -> throw RuntimeException("Unsupported family ${family.value}.")
            }
        }else if(family != null) {
            //只有主语和单目系语
            when (family.value) {
                "~+" -> SequentialItemMetaValueToDirection(metaAddress, desc = false)
                "~-" -> SequentialItemMetaValueToDirection(metaAddress, desc = true)
                else -> throw RuntimeException("Unsupported unary family ${family.value}.")
            }
        }else{
            //只有主语
            if(metaAddress.size == 1) {
                //只有1项，将其优化为single value
                SingleMetaValue(metaAddress)
            }else{
                SimpleMetaValue(metaAddress)
            }
        }
    }

    /**
     * 在系语是(:)时，根据表语翻译表达式。
     */
    private fun mapIsFamily(metaAddress: MetaAddress, predicative: Predicative): MetaValue {
        return when (predicative) {
            is StrList -> SequentialMetaValueOfCollection(metaAddress, listOf(mapStrListInPredicative(predicative)))
            is Range -> {
                val begin = mapStrToMetaString(predicative.from)
                val end = mapStrToMetaString(predicative.to)
                SequentialMetaValueOfRange(metaAddress, begin, end, includeBegin = predicative.includeFrom, includeEnd = predicative.includeTo)
            }
            is Col -> SequentialMetaValueOfCollection(metaAddress, predicative.items.map(::mapStrToMetaString))
            is SortList -> semanticError(UnsupportedElementValueType(itemName, ValueType.SORT_LIST, predicative.beginIndex, predicative.endIndex))
            else -> throw RuntimeException("Unsupported predicative ${predicative::class.simpleName}.")
        }
    }

    /**
     * 在系语是(> >= < <=)时，根据表语翻译表达式。
     */
    private fun mapCompareFamily(metaAddress: MetaAddress, symbol: String, predicative: Predicative): MetaValue {
        return when (predicative) {
            is StrList -> when (symbol) {
                ">" -> SequentialMetaValueOfRange(metaAddress, mapStrListInPredicative(predicative), null, includeBegin = false, includeEnd = false)
                ">=" -> SequentialMetaValueOfRange(metaAddress, mapStrListInPredicative(predicative), null, includeBegin = true, includeEnd = false)
                "<" -> SequentialMetaValueOfRange(metaAddress, null, mapStrListInPredicative(predicative), includeBegin = false, includeEnd = false)
                "<=" -> SequentialMetaValueOfRange(metaAddress, null, mapStrListInPredicative(predicative), includeBegin = false, includeEnd = true)
                else -> throw RuntimeException("Unsupported family $symbol.")
            }
            is Range -> semanticError(UnsupportedElementValueTypeOfRelation(itemName, ValueType.RANGE, symbol, predicative.beginIndex, predicative.endIndex))
            is Col -> semanticError(UnsupportedElementValueTypeOfRelation(itemName, ValueType.COLLECTION, symbol, predicative.beginIndex, predicative.endIndex))
            is SortList -> semanticError(UnsupportedElementValueType(itemName, ValueType.SORT_LIST, predicative.beginIndex, predicative.endIndex))
            else -> throw RuntimeException("Unsupported predicative ${predicative::class.simpleName}.")
        }
    }

    /**
     * 在系语是(~)时，根据表语翻译表达式。
     */
    private fun mapToFamily(metaAddress: MetaAddress, predicative: Predicative): MetaValue {
        return when (predicative) {
            is StrList -> SequentialItemMetaValueToOther(metaAddress, mapStrListInPredicative(predicative))
            is Range -> semanticError(UnsupportedElementValueTypeOfRelation(itemName, ValueType.RANGE, "~", predicative.beginIndex, predicative.endIndex))
            is Col -> semanticError(UnsupportedElementValueTypeOfRelation(itemName, ValueType.COLLECTION, "~", predicative.beginIndex, predicative.endIndex))
            is SortList -> semanticError(UnsupportedElementValueType(itemName, ValueType.SORT_LIST, predicative.beginIndex, predicative.endIndex))
            else -> throw RuntimeException("Unsupported predicative ${predicative::class.simpleName}.")
        }
    }

    /**
     * 处理在表语中的地址段，将其转换为单一的一节MetaString。
     * Tips: 在表语位置出现的地址段，好像在任何位置都没有多段的应用，全都是将其转换为1节……
     */
    private fun mapStrListInPredicative(strList: StrList): MetaString {
        if(strList.items.size > 1) semanticError(ValueCannotBeAddress(strList.beginIndex, strList.endIndex))
        return mapStrToMetaString(strList.items.first())
    }

    /**
     * 将主语翻译为地址段。
     */
    private fun mapSubjectToMetaAddress(subject: Subject): MetaAddress {
        if(subject !is StrList) throw RuntimeException("Unsupported subject type ${subject::class.simpleName}.")
        return subject.items.map(::mapStrToMetaString)
    }

    /**
     * 将单个字符串转换为一个MetaString。
     */
    private fun mapStrToMetaString(str: Str): MetaString {
        return MetaString(str.value, str.type == Str.Type.BACKTICKS)
    }
}

/**
 * 从annotation生成annotation的生成器。被使用在illust/book中。
 */
object AnnotationElementField : ElementFieldByAnnotation() {
    override val itemName = "annotation"

    override fun generate(annotation: Annotation, minus: Boolean): AnnotationElement {
        val metaType = annotation.prefix?.let(::mapPrefixToMetaType)
        val items = annotation.items.map(::mapStrToMetaString)
        return AnnotationElement(items, metaType, minus)
    }

    override fun forecast(annotation: Annotation, minus: Boolean, cursorIndex: Int): Forecast? {
        val metaType = annotation.prefix?.let(::mapPrefixToMetaType)
        val item = annotation.items.firstOrNull { cursorIndex >= it.beginIndex && cursorIndex <= it.endIndex } ?: return null
        return ForecastAnnotationElement(mapStrToMetaString(item), metaType, false, item.beginIndex, item.endIndex)
    }

    private fun mapPrefixToMetaType(symbol: Symbol): MetaType {
        return when (symbol.value) {
            "@" -> MetaType.AUTHOR
            "#" -> MetaType.TOPIC
            "$" -> MetaType.TAG
            else -> throw RuntimeException("Unsupported annotation prefix ${symbol.value}.")
        }
    }

    /**
     * 将单个字符串转换为一个MetaString。
     */
    private fun mapStrToMetaString(str: Str): MetaString {
        return MetaString(str.value, str.type == Str.Type.BACKTICKS)
    }
}

/**
 * 从^element生成source tag的生成器。被使用在illust中。
 */
class SourceTagElementField(override val forSourceFlag: Boolean) : ElementFieldByElement() {
    override val itemName = "source-tag"

    override fun generate(element: SemanticElement, minus: Boolean): SourceTagElement {
        if(element.prefix != null) semanticError(ElementPrefixNotRequired(itemName, element.beginIndex, element.endIndex))
        val items = element.items.map(::mapSfpToMetaValue).map(::SimpleMetaValue)
        return SourceTagElement(items, minus)
    }

    override fun forecast(element: SemanticElement, minus: Boolean, cursorIndex: Int): Forecast? {
        val sfp = element.items.firstOrNull { cursorIndex >= it.beginIndex && cursorIndex <= it.endIndex } ?: return null

        return if(sfp.subject is StrList && cursorIndex >= sfp.subject.beginIndex && cursorIndex <= sfp.subject.endIndex) {
            val idx = sfp.subject.items.indexOfFirst { cursorIndex >= it.beginIndex && cursorIndex <= it.endIndex }
            val subject = sfp.subject.items.subList(0, idx + 1).map { MetaString(it.value, it.type == Str.Type.BACKTICKS) }
            ForecastSourceTagElement(subject, sfp.subject.items[idx].beginIndex, sfp.subject.items[idx].endIndex)
        }else if(sfp.predicative is StrList && cursorIndex >= sfp.predicative.beginIndex && cursorIndex <= sfp.predicative.endIndex) {
            val subject = if(sfp.subject is StrList) sfp.subject.items.map { MetaString(it.value, it.type == Str.Type.BACKTICKS) } else emptyList()
            val idx = sfp.predicative.items.indexOfFirst { cursorIndex >= it.beginIndex && cursorIndex <= it.endIndex }
            if(idx >= 0) {
                val predicative = sfp.predicative.items.subList(0, idx + 1).map { MetaString(it.value, it.type == Str.Type.BACKTICKS) }
                ForecastSourceTagElement(subject + predicative, sfp.predicative.items[idx].beginIndex, sfp.predicative.items[idx].endIndex)
            }else{
                null
            }
        }else{
            null
        }
    }

    /**
     * 将主系表结构转换为MetaString。
     */
    private fun mapSfpToMetaValue(sfp: SFP): MetaAddress {
        if(sfp.subject !is StrList) throw RuntimeException("Unsupported subject type ${sfp.subject::class.simpleName}.")
        val subject = sfp.subject.items.map { MetaString(it.value, it.type == Str.Type.BACKTICKS) }
        val predicative: List<MetaString> = if(sfp.family != null && sfp.predicative != null) {
            when (sfp.family.value) {
                ":" -> when (sfp.predicative) {
                    is StrList -> sfp.predicative.items.map { MetaString(it.value, it.type == Str.Type.BACKTICKS) }
                    is Range, is Col, is SortList -> semanticError(UnsupportedElementValueType(MetaTagElementField.itemName, ValueType.SORT_LIST, sfp.predicative.beginIndex, sfp.predicative.endIndex))
                    else -> throw RuntimeException("Unsupported predicative ${sfp.predicative::class.simpleName}.")
                }
                ">", ">=", "<", "<=", "~" -> semanticError(UnsupportedElementRelationSymbol(itemName, sfp.family.value, sfp.family.beginIndex, sfp.family.endIndex))
                else -> throw RuntimeException("Unsupported family ${sfp.family.value}.")
            }
        }else if(sfp.family != null) {
            when (sfp.family.value) {
                "~+", "~-" -> semanticError(UnsupportedElementRelationSymbol(itemName, sfp.family.value, sfp.family.beginIndex, sfp.family.endIndex))
                else -> throw RuntimeException("Unsupported unary family ${sfp.family.value}.")
            }
        }else{
            emptyList()
        }

        return subject + predicative
    }
}

/**
 * 从element生成name filter的生成器。被使用在author&topic/annotation中。
 */
object NameFilterElementField : ElementFieldByElement() {
    override val itemName = "name"
    override val forSourceFlag = false

    override fun generate(element: SemanticElement, minus: Boolean): NameElementForMeta {
        if(element.prefix != null) semanticError(ElementPrefixNotRequired(itemName, element.beginIndex, element.endIndex))
        val items = element.items.map(::mapSfpToMetaValue)
        return NameElementForMeta(items, minus)
    }

    override fun forecast(element: SemanticElement, minus: Boolean, cursorIndex: Int): Forecast? {
        //对于name，不进行任何预测
        return null
    }

    /**
     * 将主系表结构转换为MetaString。
     */
    private fun mapSfpToMetaValue(sfp: SFP): MetaString {
        if(sfp.family != null || sfp.predicative != null) semanticError(ElementValueNotRequired(itemName, sfp.beginIndex, sfp.endIndex))
        if(sfp.subject !is StrList) throw RuntimeException("Unsupported subject type ${sfp.subject::class.simpleName}.")
        if(sfp.subject.items.size > 1) semanticError(ValueCannotBeAddress(sfp.subject.beginIndex, sfp.subject.endIndex))
        return MetaString(sfp.subject.items.first().value, sfp.subject.items.first().type == Str.Type.BACKTICKS)
    }
}

/**
 * 从annotation生成annotation的生成器。被使用在author&topic dialect中。
 */
object MetaAnnotationElementField : ElementFieldByAnnotation() {
    override val itemName = "annotation"

    override fun generate(annotation: Annotation, minus: Boolean): AnnotationElementForMeta {
        if(annotation.prefix != null) semanticError(ElementPrefixNotRequired(itemName, annotation.beginIndex, annotation.endIndex))
        val items = annotation.items.map(::mapStrToMetaString)
        return AnnotationElementForMeta(items, minus)
    }

    override fun forecast(annotation: Annotation, minus: Boolean, cursorIndex: Int): Forecast? {
        val item = annotation.items.firstOrNull { cursorIndex >= it.beginIndex && cursorIndex <= it.endIndex } ?: return null
        return ForecastAnnotationElement(mapStrToMetaString(item), null, true, item.beginIndex, item.endIndex)
    }

    /**
     * 将单个字符串转换为一个MetaString。
     */
    private fun mapStrToMetaString(str: Str): MetaString {
        return MetaString(str.value, str.type == Str.Type.BACKTICKS)
    }
}
