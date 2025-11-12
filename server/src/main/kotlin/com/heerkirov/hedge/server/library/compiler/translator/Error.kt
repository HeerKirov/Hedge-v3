package com.heerkirov.hedge.server.library.compiler.translator

import com.heerkirov.hedge.server.library.compiler.utils.TranslatorError


/**
 * (warning)元素类的meta tag或annotation的字面值给出了空串。
 */
class BlankElement : TranslatorError<Nothing>(4001, "Element cannot be blank.")

/**
 * (warning)元素类的一个项匹配了数量为0的实现。和下一个的区别是，它在queryer的实现层调用，且它提示的是某个写出来的元素为空。而当一整个合取项的匹配都为空时，下面的警告也会一起抛出。
 */
class ElementMatchesNone(item: String) : TranslatorError<String>(4002, "Element item '$item' matches none.", info = item)

/**
 * (warning)元素类的meta tag或annotation的一个合取项匹配了数量为0的实现。这将导致整个匹配表达式为false。
 */
class WholeElementMatchesNone(items: List<String>) : TranslatorError<List<String>>(4003, "The whole element '${items.joinToString("|")}' matches none.", info = items)

/**
 * (warning)进行区间匹配的区间端点没有匹配到任何实现。这将导致区间选择器的范围发生不合期望的溢出。
 */
class RangeElementNotFound(item: String) : TranslatorError<String>(4004, "Range element '$item' cannot match any item.", info = item)

/**
 * (warning)此项的目标是匹配一个排序组/排序组成员，但查询得到的结果标签却并不是期望中的类型。这样的话此项会被忽略。
 */
class ElementMatchedButNotGroup(item: String, goal: MatchGoal) : TranslatorError<ElementMatchedButNotGroup.Info>(4005, "Element '$item' matched, but result is not a $goal.", info = Info(item, goal)) {
    data class Info(val item: String, val goal: MatchGoal)
    enum class MatchGoal { GROUP, MEMBER }
}

/**
 * (warning)元素类的meta tag或annotation查询所对应的项的数量达到了警告阈值。这意味着一个连接查询中的or项目可能过多，拖慢查询速度。
 */
class NumberOfUnionItemExceed(items: List<String>, warningLimit: Int) : TranslatorError<NumberOfUnionItemExceed.Info>(4007, "The number of the union items exceeds the warning limit $warningLimit.", info = Info(items, warningLimit)) {
    data class Info(val items: List<String>, val warningLimit: Int)
}

/**
 * (warning)元素类的meta tag或annotation查询的合取项的数量达到了警告阈值。这意味着连接查询的层数可能过多，严重拖慢查询速度。
 */
class NumberOfIntersectItemExceed(warningLimit: Int) : TranslatorError<Int>(4008, "The number of the intersect items exceeds the warning limit $warningLimit.", info = warningLimit)
