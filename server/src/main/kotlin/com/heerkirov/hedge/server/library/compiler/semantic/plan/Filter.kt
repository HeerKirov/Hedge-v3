package com.heerkirov.hedge.server.library.compiler.semantic.plan

import com.heerkirov.hedge.server.library.compiler.semantic.framework.FilterFieldDefinition
import java.time.LocalDate

/**
 * 外层的过滤器合取范式。
 */
typealias IntersectFilters = List<UnionFilters>

/**
 * 内层的过滤器合取项。
 * @param exclude 排除项。
 */
data class UnionFilters(private val filters: Collection<Filter<out FilterValue>>, val exclude: Boolean = false) : Collection<Filter<out FilterValue>> by filters

/**
 * 过滤器项。每一条过滤器项代表一个关系判别表达式子项。它包含一项属性定义，然后由实现确定关系类型和关系目标值。
 */
interface Filter<V : FilterValue> {
    /**
     * 过滤器指向的属性定义。属性定义的泛型参数已经锁定了它能启用的关系类型和目标值类型。
     */
    val field: FilterFieldDefinition<V>
}

/**
 * composition类型过滤器。此属性专为组合类型准备，其values允许为0、1或多个。
 */
data class CompositionFilter<V : EquableValue<*>>(override val field: FilterFieldDefinition<V>, val values: Collection<V>) : Filter<V>

/**
 * 等价过滤器。此属性必须与目标值完全相等。目标值可给出1或多个，满足任一即达成判定条件。
 */
data class EqualFilter<V : EquableValue<*>>(override val field: FilterFieldDefinition<V>, val values: Collection<V>) : Filter<V>

/**
 * 匹配过滤器。此属性必须与目标值按匹配规则模糊匹配。目标值可给出1或多个，满足任一即达成判定条件。
 */
data class MatchFilter<V : MatchableValue<*>>(override val field: FilterFieldDefinition<V>, val values: Collection<V>, val exact: Boolean) : Filter<V>

/**
 * 范围比较过滤器。此属性必须满足给定的begin to end的上下界范围。include参数决定是否包含上下界。
 */
data class RangeFilter<V : ComparableValue<*>>(override val field: FilterFieldDefinition<V>, val begin: V?, val end: V?, val includeBegin: Boolean, val includeEnd: Boolean) : Filter<V>

/**
 * 标记过滤器。此属性是布尔属性，没有目标值。
 */
data class FlagFilter(override val field: FilterFieldDefinition<FilterNothingValue>) : Filter<FilterNothingValue>


/**
 * filter的目标值。
 */
interface FilterValue

/**
 * 可匹配的目标值类型。
 */
interface MatchableValue<T : Any> : FilterValue {
    val matchValue: T
}

/**
 * 可进行等价判定的目标值类型。
 */
interface EquableValue<T : Any> : FilterValue {
    val equalValue: T
}

/**
 * 可进行范围比较的目标值类型。
 */
interface ComparableValue<T : Comparable<T>> : FilterValue {
    val compareValue: T
}


/**
 * 数字类型：可等价判断或区间比较。
 */
interface FilterNumberValue : FilterValue, EquableValue<Long>, ComparableValue<Long> {
    val value: Long
    override val compareValue get() = value
    override val equalValue get() = value
}

/**
 * 数字类型：可等价判断或区间比较。
 */
interface FilterFloatNumberValue : FilterValue, EquableValue<Double>, ComparableValue<Double> {
    val value: Double
    override val compareValue get() = value
    override val equalValue get() = value
}

/**
 * 匹配数字类型：在数字类型的基础上，追加可进行匹配判断。其实现是string类型。
 */
interface FilterPatternNumberValue : FilterValue, EquableValue<Long>, ComparableValue<Long>, MatchableValue<String> {
    fun isPattern(): Boolean
}

/**
 * 日期类型：可等价判断或区间比较。
 */
interface FilterDateValue : FilterValue, EquableValue<LocalDate>, ComparableValue<LocalDate> {
    val value: LocalDate
    override val compareValue get() = value
    override val equalValue get() = value
}

/**
 * 文件大小类型：可等价判断或区间比较。
 */
interface FilterSizeValue : FilterValue, EquableValue<Long>, ComparableValue<Long> {
    val value: Long
    override val compareValue get() = value
    override val equalValue get() = value
}

/**
 * 字符串类型：可等价判断或匹配判断。
 */
interface FilterStringValue : FilterValue, EquableValue<String>, MatchableValue<String> {
    val value: String
    override val equalValue get() = value
    override val matchValue get() = value
}

/**
 * 枚举类型：可等价判断。
 */
interface FilterEnumValue<T : Enum<T>> : FilterValue, EquableValue<T> {
    val value: T
    override val equalValue get() = value
}

/**
 * Nothing类型：只能用作布尔值。
 */
interface FilterNothingValue : FilterValue


@JvmInline
value class FilterStringValueImpl(override val value: String) : FilterStringValue

@JvmInline
value class FilterNumberValueImpl(override val value: Long) : FilterNumberValue

@JvmInline
value class FilterFloatNumberValueImpl(override val value: Double) : FilterFloatNumberValue

@JvmInline
value class FilterDateValueImpl(override val value: LocalDate) : FilterDateValue

@JvmInline
value class FilterSizeValueImpl(override val value: Long) : FilterSizeValue

data class FilterEnumValueImpl<T : Enum<T>>(override val value: T) : FilterEnumValue<T>

class FilterPatternNumberValueImpl : FilterPatternNumberValue {
    private val number: Long?
    private val pattern: String?

    constructor(number: Long) {
        this.number = number
        this.pattern = null
    }
    constructor(pattern: String) {
        this.number = null
        this.pattern = pattern
    }

    override fun isPattern() = pattern != null

    override val equalValue get() = number ?: throw ClassCastException("Pattern value cannot be as equable.")

    override val compareValue get() = number ?: throw ClassCastException("Pattern value cannot be as comparable.")

    override val matchValue get() = pattern ?: throw ClassCastException("Number value cannot be as matchable.")

    override fun equals(other: Any?): Boolean {
        return other === this || (other is FilterPatternNumberValueImpl && other.number == number && other.pattern == pattern)
    }

    override fun hashCode(): Int {
        return (number?.hashCode() ?: 0) * 31 + (pattern?.hashCode() ?: 0)
    }

    override fun toString(): String {
        return "FilterPatternNumberValueImpl(value=${if(isPattern()) pattern else number})"
    }
}