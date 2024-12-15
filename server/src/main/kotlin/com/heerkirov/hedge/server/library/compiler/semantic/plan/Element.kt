package com.heerkirov.hedge.server.library.compiler.semantic.plan


/**
 * 连接元素的列表，相当于合取范式。
 */
typealias Elements = List<Element<*>>

/**
 * 连接元素。连接元素都是标准的合取范式，每个元素都是一个合取项。
 */
interface Element<V : Any> {
    /**
     * 元素的子项。彼此之间通过或计算连接。
     */
    val items: List<V>
    /**
     * 排除这个元素。
     */
    val exclude: Boolean
}

/**
 * 此元素可以一定程度上还原为查询语句中的文本表述。
 */
interface Revertible {
    fun revertToQueryString(): String
}

/**
 * 连接元素中的连接目标类型。
 */
enum class MetaType {
    TAG, TOPIC, AUTHOR
}

/**
 * 实现为名称的连接元素。
 */
data class NameElementForMeta(override val items: List<MetaString>, override val exclude: Boolean) : Element<MetaString>

/**
 * 实现为描述信息的连接元素。
 */
data class CommentElementForMeta(override val items: List<MetaString>, override val exclude: Boolean) : Element<MetaString>

/**
 * 实现为源标签的连接元素。
 */
data class SourceTagElement(override val items: List<SimpleMetaValue>, override val exclude: Boolean) : Element<SimpleMetaValue>

/**
 * 实现为meta tag的连接元素。它是一个抽象类，并应对三种不同的meta tag有各自的实现。当前层级是对tag的实现。它在topic的基础上扩展了序列化成员。
 */
abstract class TagElement<M : MetaValue>(val metaType: MetaType?, override val exclude: Boolean) : Element<M>

/**
 * 实现为meta tag的连接元素。它是一个抽象类，并应对三种不同的meta tag有各自的实现。当前层级是对topic的实现。它在author的基础上扩展了多级地址。
 */
abstract class TopicElement<M : SimpleMetaValue>(metaType: MetaType?, exclude: Boolean) : TagElement<M>(metaType, exclude)

/**
 * 实现为meta tag的连接元素。它是一个抽象类，并应对三种不同的meta tag有各自的实现。当前层级是对author的实现。它只有单级地址。
 */
abstract class AuthorElement(metaType: MetaType?, exclude: Boolean) : TopicElement<SingleMetaValue>(metaType, exclude)

/**
 * tag的实现。
 */
class TagElementImpl(override val items: List<MetaValue>, metaType: MetaType?, exclude: Boolean) : TagElement<MetaValue>(metaType, exclude) {
    override fun equals(other: Any?): Boolean {
        return other === this || (other is TagElementImpl && other.items == items && other.metaType == metaType && other.exclude == exclude)
    }

    override fun hashCode(): Int {
        return items.hashCode() * 31 * 31 + metaType.hashCode() * 31 + exclude.hashCode() * 31
    }

    override fun toString(): String {
        return "TagElement(type=$metaType, exclude=$exclude)$items"
    }
}

/**
 * topic的实现。
 */
class TopicElementImpl(override val items: List<SimpleMetaValue>, metaType: MetaType?, exclude: Boolean) : TopicElement<SimpleMetaValue>(metaType, exclude) {
    override fun equals(other: Any?): Boolean {
        return other === this || (other is TopicElementImpl && other.items == items && other.metaType == metaType && other.exclude == exclude)
    }

    override fun hashCode(): Int {
        return items.hashCode() * 31 * 31 + metaType.hashCode() * 31 + exclude.hashCode() * 31
    }

    override fun toString(): String {
        return "TopicElement(type=$metaType, exclude=$exclude)$items"
    }
}

/**
 * author的实现。
 */
class AuthorElementImpl(override val items: List<SingleMetaValue>, metaType: MetaType?, exclude: Boolean) : AuthorElement(metaType, exclude) {
    override fun equals(other: Any?): Boolean {
        return other === this || (other is AuthorElementImpl && other.items == items && other.metaType == metaType && other.exclude == exclude)
    }

    override fun hashCode(): Int {
        return items.hashCode() * 31 * 31 + metaType.hashCode() * 31 + exclude.hashCode() * 31
    }

    override fun toString(): String {
        return "AuthorElement(type=$metaType, exclude=$exclude)$items"
    }
}


/**
 * 一个在连接元素中的meta tag的表示值。
 */
sealed class MetaValue : Revertible

/**
 * 表示单一的meta tag值。
 */
open class SimpleMetaValue(val value: MetaAddress) : MetaValue() {
    override fun equals(other: Any?): Boolean {
        return other === this || (other is SimpleMetaValue && other.value == value)
    }

    override fun hashCode(): Int {
        return value.hashCode()
    }

    override fun revertToQueryString(): String {
        return value.joinToString(".") { it.revertToQueryString() }
    }
}

/**
 * 表示单一的meta tag值，且只有单段地址段。
 */
class SingleMetaValue(value: MetaAddress) : SimpleMetaValue(value) {
    val singleValue: MetaString get() = value.first()

    constructor(value: MetaString): this(listOf(value))

    override fun equals(other: Any?): Boolean {
        return other === this || (other is SingleMetaValue && other.singleValue == singleValue)
    }

    override fun hashCode(): Int {
        return singleValue.hashCode()
    }

    override fun revertToQueryString(): String {
        return singleValue.revertToQueryString()
    }
}

/**
 * 表示从一个序列化组meta tag下选择的限定值。
 */
abstract class SequentialMetaValue : MetaValue() {
    abstract val tag: MetaAddress
}

/**
 * 表示从一个序列化组员(不指定序列化组)衍生的序列化限定值。
 */
abstract class SequentialItemMetaValue : MetaValue() {
    abstract val tag: MetaAddress
}

/**
 * 从一个集合中选择序列化子项。
 */
data class SequentialMetaValueOfCollection(override val tag: MetaAddress, val values: Collection<MetaString>) : SequentialMetaValue() {
    override fun revertToQueryString(): String {
        return tag.joinToString(".") { it.revertToQueryString() } + ":" + if(values.size == 1) {
            values.first().revertToQueryString()
        }else{
            "{${values.joinToString(",") { it.revertToQueryString() }}}"
        }
    }
}

/**
 * 从一个区间范围选择序列化子项。其begin和end都是可选的。
 */
data class SequentialMetaValueOfRange(override val tag: MetaAddress, val begin: MetaString?, val end: MetaString?, val includeBegin: Boolean, val includeEnd: Boolean) : SequentialMetaValue() {
    override fun revertToQueryString(): String {
        return tag.joinToString(".") { it.revertToQueryString() } + if(end == null) {
            (if(includeBegin) ">=" else ">") + begin!!.revertToQueryString()
        }else if(begin == null) {
            (if(includeEnd) "<=" else "<") + end.revertToQueryString()
        }else{
            ":[${begin.revertToQueryString()},${end.revertToQueryString()}]"
        }
    }
}

/**
 * 从一个序列化组员到另一个组员，begin和end都包括。
 */
data class SequentialItemMetaValueToOther(override val tag: MetaAddress, val otherTag: MetaString) : SequentialItemMetaValue() {
    override fun revertToQueryString(): String {
        return tag.joinToString(".") { it.revertToQueryString() } + "~" + otherTag.revertToQueryString()
    }
}

/**
 * 从一个序列化组员到指定的方向。
 */
data class SequentialItemMetaValueToDirection(override val tag: MetaAddress, private val desc: Boolean) : SequentialItemMetaValue() {
    fun isDescending() = desc
    override fun revertToQueryString(): String {
        return tag.joinToString(".") { it.revertToQueryString() } + "~" + if(desc) "-" else "+"
    }
}

/**
 * 用地址表示的meta tag。
 */
typealias MetaAddress = List<MetaString>

/**
 * 表示一个meta tag的值，或meta tag地址中的一段。
 * @param value 字面值
 * @param precise 是否是精准匹配的字面值
 */
data class MetaString(val value: String, val precise: Boolean = false) : Revertible {
    override fun revertToQueryString(): String {
        return if(precise) "`$value`" else value
    }
}