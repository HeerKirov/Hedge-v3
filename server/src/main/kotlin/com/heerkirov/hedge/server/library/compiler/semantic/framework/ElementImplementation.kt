package com.heerkirov.hedge.server.library.compiler.semantic.framework

import com.heerkirov.hedge.server.library.compiler.grammar.semantic.*
import com.heerkirov.hedge.server.library.compiler.grammar.semantic.Annotation
import com.heerkirov.hedge.server.library.compiler.semantic.*
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

    /**
     * 将单个字符串转换为一个MetaString。
     */
    private fun mapStrToMetaString(str: Str): MetaString {
        return MetaString(str.value, str.type == Str.Type.BACKTICKS)
    }
}
