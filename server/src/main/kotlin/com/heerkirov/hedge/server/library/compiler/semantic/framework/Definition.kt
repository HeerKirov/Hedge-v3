package com.heerkirov.hedge.server.library.compiler.semantic.framework

import com.heerkirov.hedge.server.library.compiler.grammar.semantic.Annotation
import com.heerkirov.hedge.server.library.compiler.grammar.semantic.Element as SemanticElement
import com.heerkirov.hedge.server.library.compiler.grammar.semantic.Family
import com.heerkirov.hedge.server.library.compiler.grammar.semantic.Predicative
import com.heerkirov.hedge.server.library.compiler.grammar.semantic.StrList
import com.heerkirov.hedge.server.library.compiler.semantic.plan.*


/**
 * 此filter/element从一个关键字指示的特定项生成。
 */
interface GeneratedByIdentify<R : Any> {
    /**
     * 指示此生成器的关键字别名。
     */
    val alias: Array<out String>

    /**
     * 从此关键字指示的SFP生成结果。结果为null时，表示丢弃此结果。
     */
    fun generate(subject: StrList, family: Family?, predicative: Predicative?): R?
}

/**
 * 此filter/element从一个普通元素生成。
 */
interface GeneratedByElement<R : Any> {
    /**
     * 此生成器对sourceFlag标记的元素是否接受。true表示接受没有sourceFlag标记的项，false表示接受有sourceFlag标记的项。
     */
    val forSourceFlag: Boolean
    /**
     * 从一整个元素构造结果。
     */
    fun generate(element: SemanticElement, minus: Boolean): R
}

/**
 * 此element从一个注解元素生成。
 */
interface GeneratedByAnnotation<R : Any> {
    /**
     * 从一整个注解构造结果。
     */
    fun generate(annotation: Annotation, minus: Boolean): R
}

/**
 * 扩展从关键字指示的项生成，生成多个项。
 */
interface GeneratedSequenceByIdentify<R : Any> : GeneratedByIdentify<R> {
    override fun generate(subject: StrList, family: Family?, predicative: Predicative?): R = throw UnsupportedOperationException()

    /**
     * 从此关键字指示的SFP生成多个结果。
     */
    fun generateSeq(subject: StrList, family: Family?, predicative: Predicative?): Sequence<R>
}


/**
 * 过滤器的目标属性定义。
 */
interface FilterFieldDefinition<V : FilterValue> {
    val key: String
}

/**
 * 连接元素的生成器定义。
 */
interface ElementFieldDefinition {
    val itemName: String
}

/**
 * 排序列表的生成器定义。
 */
interface OrderFieldDefinition<E : Enum<E>>


/**
 * 从关键字指示的项生成Filter。
 */
abstract class FilterFieldByIdentify<V : FilterValue> : FilterFieldDefinition<V>, GeneratedByIdentify<Filter<V>>

/**
 * 用普通元素生成JoinElement。
 */
abstract class ElementFieldByElement : ElementFieldDefinition, GeneratedByElement<Element<*>>

/**
 * 用注解元素生成JoinElement。
 */
abstract class ElementFieldByAnnotation : ElementFieldDefinition, GeneratedByAnnotation<Element<*>>

/**
 * 从关键字指示的项生成Filter。
 */
abstract class OrderFieldByIdentify<E : Enum<E>> : OrderFieldDefinition<E>, GeneratedByIdentify<Orders> {
    override val alias: Array<out String> = arrayOf("order")
}