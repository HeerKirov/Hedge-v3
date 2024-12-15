package com.heerkirov.hedge.server.library.compiler.grammar.semantic

/**
 * 语义树上的一个节点。
 */
interface SemanticNode

/**
 * 带有位置信息的节点。位置信息指在原始语句字符串中，该语义节点的起始和终止位置[begin, end)。
 */
interface IndexedSemanticNode : SemanticNode {
    val beginIndex: Int
    val endIndex: Int
}

/**
 * 语句节点。一般的根节点。
 * @param items 语句的项。彼此之间通过与(&)连接。
 */
data class SemanticRoot(val items: List<SequenceItem>, override val beginIndex: Int, override val endIndex: Int) : IndexedSemanticNode

/**
 * 语句项。
 * @param body 主体
 * @param minus 排除项(-)
 * @param source 源项（^）
 */
data class SequenceItem(val minus: Boolean, val source: Boolean, val body: SequenceBody, override val beginIndex: Int, override val endIndex: Int) : IndexedSemanticNode

/**
 * 语句项的主体内容。
 */
interface SequenceBody : IndexedSemanticNode

/**
 * 元素。
 * @param prefix 元素的前缀符号，包括(@ # $)。
 * @param items 元素的项，彼此之间通过或(|)连接。
 */
data class Element(val prefix: Symbol?, val items: List<SFP>, override val beginIndex: Int, override val endIndex: Int) : SequenceBody

/**
 * 括号标记。
 * @param items 内容项，彼此之间通过空格分开。
 */
data class Bracket(val items: List<Str>, override val beginIndex: Int, override val endIndex: Int) : SequenceBody

/**
 * 主系表结构。
 * @param subject 主语。
 * @param family 系语。
 * @param predicative 表语。
 */
data class SFP(val subject: Subject, val family: Family?, val predicative: Predicative?, override val beginIndex: Int, override val endIndex: Int) : IndexedSemanticNode

/**
 * 主语。
 */
interface Subject : IndexedSemanticNode

/**
 * 系语。
 * @param value 目标符号，可用符号包括(: > >= < <= ~ ~+ ~-)。
 */
data class Family(val value: String, override val beginIndex: Int, override val endIndex: Int) : IndexedSemanticNode

/**
 * 表语。
 */
interface Predicative : IndexedSemanticNode

/**
 * 形式为a.b.c的字符串项。
 */
abstract class StrList : Subject, Predicative {
    abstract val items: List<Str>
}

/**
 * 字符串项的可变实现。
 */
data class StrListImpl(override val items: MutableList<Str>, override val beginIndex: Int, override var endIndex: Int) : StrList() {
    fun add(value: Str): StrListImpl {
        items.add(value)
        endIndex = value.endIndex
        return this
    }
}

/**
 * 集合。
 * @param items 集合的项，通过(,)连接。
 */
data class Col(val items: List<Str>, override val beginIndex: Int, override val endIndex: Int) : Predicative

/**
 * 区间。
 * @param from 区间起始。
 * @param to 区间终结。
 * @param includeFrom 是否包括区间起始。
 * @param includeTo 是否包括区间终结。
 */
data class Range(val from: Str, val to: Str, val includeFrom: Boolean, val includeTo: Boolean, override val beginIndex: Int, override val endIndex: Int) : Predicative

/**
 * 排序列表。
 */
abstract class SortList : Predicative {
    abstract val items: List<SortItem>
}

/**
 * 排序列表的可变实现。
 */
data class SortListImpl(override val items: MutableList<SortItem>, override val beginIndex: Int, override var endIndex: Int) : SortList() {
    fun add(value: SortItem): SortListImpl {
        items.add(value)
        endIndex = value.endIndex
        return this
    }
}

/**
 * 排序列表的项。
 * @param value 项名。
 * @param source 来自源的项。
 * @param direction 这个项的方向。-1表示(-)，+1表示(+)，0表示未指明。
 */
data class SortItem(val value: Str, val source: Boolean, val direction: Int, override val beginIndex: Int, override val endIndex: Int) : IndexedSemanticNode

/**
 * 临时节点：可变列表。
 */
data class MutList<T : IndexedSemanticNode>(val items: MutableList<T>) : SemanticNode {
    val beginIndex: Int get() = items.first().beginIndex
    val endIndex: Int get() = items.last().endIndex
    val size: Int get() = items.size

    fun add(value: T): MutList<T> {
        items.add(value)
        return this
    }

    fun toList(): List<T> = items.toList()
}

/**
 * 词素：字符串。
 * @param value 字符串的值。
 * @param type 字符串的形式类型。
 */
data class Str(val value: String, val type: Type, override val beginIndex: Int, override val endIndex: Int) : IndexedSemanticNode {
    enum class Type { RESTRICTED, APOSTROPHE, DOUBLE_QUOTES, BACKTICKS }
}

/**
 * 词素：符号。
 * @param value 符号的值。
 */
data class Symbol(val value: String, override val beginIndex: Int, override val endIndex: Int) : IndexedSemanticNode