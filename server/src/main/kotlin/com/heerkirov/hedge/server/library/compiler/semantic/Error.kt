package com.heerkirov.hedge.server.library.compiler.semantic

import com.heerkirov.hedge.server.library.compiler.utils.SemanticError
import com.heerkirov.hedge.server.library.compiler.utils.range

/**
 * 一个基本信息单元。
 * @param key 对于filter，它是定义field时的key；对于element，它是生成器定义时的itemName。用来标记此错误抛出的项目种类。
 */
open class BasicInfo(val key: String)

/**
 * 值的类型。
 */
enum class ValueType { COLLECTION, RANGE, SORT_LIST }

//== 关键字项目相关 ==

/**
 * 此关键字项目要求关系和值，但是缺失了关系和值。[begin, end)应标记关键字的subject。
 */
class FilterValueRequired(filterName: String, beginIndex: Int, endIndex: Int) : SemanticError<BasicInfo>(3001, "Filter $filterName: relation and value is required.", range(beginIndex, endIndex), BasicInfo(filterName))

/**
 * 此关键字项目不应该有关系和值。[begin, end)应标记关键字的sfp。
 */
class FilterValueNotRequired(filterName: String, beginIndex: Int, endIndex: Int) : SemanticError<BasicInfo>(3002, "Filter $filterName: relation and value is not required.", range(beginIndex, endIndex), BasicInfo(filterName))

/**
 * 此关键字项目不支持这个种类的值。和下一个的区别是，无论如何不应该出现这个种类的值。[begin, end)应标记predicative。
 */
class UnsupportedFilterValueType(filterName: String, valueType: ValueType, beginIndex: Int, endIndex: Int) : SemanticError<UnsupportedFilterValueType.SelfFilterInfo>(3003, "Filter $filterName: type $valueType is unsupported.", range(beginIndex, endIndex), SelfFilterInfo(filterName, valueType)) {
    class SelfFilterInfo(filterName: String, val valueType: ValueType) : BasicInfo(filterName)
}

/**
 * 此关键字项目下，当前关系不支持这个种类的值。和上一个的区别是，换一个运算符号可能支持。[begin, end)应标记predicative。
 */
class UnsupportedFilterValueTypeOfRelation(filterName: String, valueType: ValueType, symbol: String, beginIndex: Int, endIndex: Int) : SemanticError<UnsupportedFilterValueTypeOfRelation.SelfFilterInfo>(3004, "Filter $filterName: type $valueType is unsupported in relation '$symbol'.", range(beginIndex, endIndex), SelfFilterInfo(filterName, valueType, symbol)) {
    class SelfFilterInfo(filterName: String, val valueType: ValueType, val symbol: String) : BasicInfo(filterName)
}

/**
 * 此关键字项目不支持这个种类的关系运算。[begin, end)应标记family。
 */
class UnsupportedFilterRelationSymbol(filterName: String, symbol: String, beginIndex: Int, endIndex: Int) : SemanticError<UnsupportedFilterRelationSymbol.SelfFilterInfo>(3005, "Filter $filterName: relation '$symbol' is unsupported.", range(beginIndex, endIndex), SelfFilterInfo(filterName, symbol)) {
    class SelfFilterInfo(filterName: String, val symbol: String) : BasicInfo(filterName)
}

//== 元素相关 ==

/**
 * 此条meta tag元素的结构不满足显式指定的类型限制。topic(#)要求结构不能有关系和值; author(@)要求结构必须是单节地址。[begin, end)应标记整个element。
 */
class InvalidMetaTagForThisPrefix(symbol: String, beginIndex: Int, endIndex: Int) : SemanticError<String>(3006, "Invalid meta tag structure for prefix '$symbol'.", range(beginIndex, endIndex), symbol)

/**
 * 这一种类的element要求不能有类型前缀，但是给出了前缀。[begin, end)应标记element。
 */
class ElementPrefixNotRequired(itemName: String, beginIndex: Int, endIndex: Int) : SemanticError<BasicInfo>(3007, "Element of $itemName: prefix is not required.", range(beginIndex, endIndex), BasicInfo(itemName))

/**
 * 此元素项目不应该有关系和值。[begin, end)应标记关键字的sfp。
 */
class ElementValueNotRequired(itemName: String, beginIndex: Int, endIndex: Int) : SemanticError<BasicInfo>(3008, "Element of $itemName: relation and value is not required.", range(beginIndex, endIndex), BasicInfo(itemName))

/**
 * 此元素项目不支持这个种类的值。和下一个的区别是，无论如何不应该出现这个种类的值。[begin, end)应标记predicative。
 */
class UnsupportedElementValueType(itemName: String, valueType: ValueType, beginIndex: Int, endIndex: Int) : SemanticError<UnsupportedElementValueType.SelfFilterInfo>(3009, "Element of $itemName: type $valueType is unsupported.", range(beginIndex, endIndex), SelfFilterInfo(itemName, valueType)) {
    class SelfFilterInfo(filterName: String, val valueType: ValueType) : BasicInfo(filterName)
}

/**
 * 此元素项目下，当前关系不支持这个种类的值。和上一个的区别是，换一个运算符号可能支持。[begin, end)应标记predicative。
 */
class UnsupportedElementValueTypeOfRelation(itemName: String, valueType: ValueType, symbol: String, beginIndex: Int, endIndex: Int) : SemanticError<UnsupportedElementValueTypeOfRelation.SelfFilterInfo>(3010, "Element of $itemName: type $valueType is unsupported in relation '$symbol'.", range(beginIndex, endIndex), SelfFilterInfo(itemName, valueType, symbol)) {
    class SelfFilterInfo(filterName: String, val valueType: ValueType, val symbol: String) : BasicInfo(filterName)
}

/**
 * 此元素项目不支持这个种类的关系运算。[begin, end)应标记family。
 */
class UnsupportedElementRelationSymbol(itemName: String, symbol: String, beginIndex: Int, endIndex: Int) : SemanticError<UnsupportedElementRelationSymbol.SelfFilterInfo>(3011, "Element of $itemName: relation '$symbol' is unsupported.", range(beginIndex, endIndex), SelfFilterInfo(itemName, symbol)) {
    class SelfFilterInfo(filterName: String, val symbol: String) : BasicInfo(filterName)
}

//== 排序项相关 ==

/**
 * 排序项目需要有关系和值。[begin, end)应标记关键字的subject。
 */
class SortValueRequired(beginIndex: Int, endIndex: Int) : SemanticError<Nothing>(3012, "Sort: relation and value is required.", range(beginIndex, endIndex))

/**
 * 排序项目的关系和值必须是:排序列表。[begin, end)应标记项目的sfp。
 */
class SortValueMustBeSortList(beginIndex: Int, endIndex: Int) : SemanticError<Nothing>(3013, "Sort: relation and value must be sort list.", range(beginIndex, endIndex))

/**
 * 值不是正确的排序列表项。[begin, end)应标记项目的sfp。
 */
class InvalidSortItem(invalidItem: String, expected: List<String>, beginIndex: Int, endIndex: Int) : SemanticError<InvalidSortItem.Info>(3014, "Sort: item '$invalidItem' is invalid. Expected $expected.", range(beginIndex, endIndex), Info(invalidItem, expected)) {
    class Info(val value: String, val expected: List<String>)
}

/**
 * 排序项是独立而特别的：它不能被排除(-)，不能标记为来源项(^)，也不能和任何项用或(|)连接。[begin, end)标记整个body。
 */
class SortIsIndependent(beginIndex: Int, endIndex: Int) : SemanticError<Nothing>(3015, "Sort item is independent: it cannot be exclude, source, or be connected with or(|).", range(beginIndex, endIndex))

/**
 * 出现了重复的排序项。后一次出现的项会被忽略。[begin, end)标记这个sort项。
 */
class DuplicatedSortItem(duplicatedItem: String, beginIndex: Int, endIndex: Int) : SemanticError<String>(3016, "Sort: item '$duplicatedItem' is duplicated.", range(beginIndex, endIndex), info = duplicatedItem)

//== 值类型相关 ==

/**
 * 值不能写成meta tag地址段的形式(a.b.c)，只能是一项string。[begin, end)应标记地址段strList。
 */
class ValueCannotBeAddress(beginIndex: Int, endIndex: Int) : SemanticError<Nothing>(3017, "Value cannot be a tag address.", range(beginIndex, endIndex))

/**
 * 值在比较运算或区间中不能写成模糊匹配项。[begin, end)应标记值。
 */
class ValueCannotBePatternInComparison(beginIndex: Int, endIndex: Int) : SemanticError<Nothing>(3018, "Value in comparison relation or range cannot be pattern.", range(beginIndex, endIndex))

/**
 * 类型转换错误：str无法转换为目标类型的值。[begin, end)应标记值。
 */
class TypeCastError(value: String, type: Type, beginIndex: Int, endIndex: Int) : SemanticError<TypeCastError.Info>(3019, "Type cast error: '$value' cannot be cast to type $type.", range(beginIndex, endIndex), Info(value, type)) {
    class Info(val value: String, val type: Type)
    enum class Type { NUMBER, SIZE, DATE }
}

/**
 * 类型转换错误：str无法转换为目标枚举类型的值。[begin, end)应标记值。
 */
class EnumTypeCastError(value: String, type: String, expected: List<String>, beginIndex: Int, endIndex: Int) : SemanticError<EnumTypeCastError.Info>(3020, "Type cast error: '$value' cannot be cast to enum type $type. Expected $expected.", range(beginIndex, endIndex), Info(value, type, expected)) {
    class Info(val value: String, val type: String, val expected: List<String>)
}

//== 构造语义相关 ==

/**
 * 当前方言不支持这个种类的语义。[begin, end)标记整个element。
 */
class UnsupportedSemanticStructure(type: SemanticType, beginIndex: Int, endIndex: Int) : SemanticError<UnsupportedSemanticStructure.SemanticType>(3021, "Unsupported semantic structure $type.", range(beginIndex, endIndex), type) {
    enum class SemanticType { ELEMENT, ELEMENT_WITH_SOURCE, ANNOTATION }
}

/**
 * 元素和关键字项不能在同一个合取项中混写。[begin, end)标记整个element。
 */
class IdentifiesAndElementsCannotBeMixed(beginIndex: Int, endIndex: Int) : SemanticError<Nothing>(3022, "Identifies and elements cannot be mixed in one conjunct.", range(beginIndex, endIndex))

/**
 * 这一个关键字是不能带sourceFlag(^)的，它没有source对应的项。[begin, end)标记subject。
 */
class ThisIdentifyCannotHaveSourceFlag(key: String, beginIndex: Int, endIndex: Int) : SemanticError<String>(3023, "Identify $key cannot have source flag.", range(beginIndex, endIndex), key)

/**
 * 这一个关键字是必须带sourceFlag(^)的，它没有非source对应的项。[begin, end)标记subject。
 */
class ThisIdentifyMustHaveSourceFlag(key: String, beginIndex: Int, endIndex: Int) : SemanticError<String>(3024, "Identify $key must have source flag.", range(beginIndex, endIndex), key)

/**
 * 注解类项目是不能标记为from source(^)的。[begin, end)标记整个body。
 */
class AnnotationCannotHaveSourceFlag(beginIndex: Int, endIndex: Int) : SemanticError<Nothing>(3025, "Annotation cannot have source flag.", range(beginIndex, endIndex))
