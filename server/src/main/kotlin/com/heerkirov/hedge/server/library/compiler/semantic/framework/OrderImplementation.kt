package com.heerkirov.hedge.server.library.compiler.semantic.framework

import com.heerkirov.hedge.server.library.compiler.grammar.semantic.Family
import com.heerkirov.hedge.server.library.compiler.grammar.semantic.Predicative
import com.heerkirov.hedge.server.library.compiler.grammar.semantic.SortList
import com.heerkirov.hedge.server.library.compiler.grammar.semantic.StrList
import com.heerkirov.hedge.server.library.compiler.semantic.InvalidOrderItem
import com.heerkirov.hedge.server.library.compiler.semantic.OrderValueMustBeSortList
import com.heerkirov.hedge.server.library.compiler.semantic.OrderValueRequired
import com.heerkirov.hedge.server.library.compiler.semantic.plan.Forecast
import com.heerkirov.hedge.server.library.compiler.semantic.plan.ForecastOrder
import com.heerkirov.hedge.server.library.compiler.semantic.plan.Order
import com.heerkirov.hedge.server.library.compiler.semantic.plan.Orders
import com.heerkirov.hedge.server.library.compiler.semantic.utils.*


/**
 * 排序列表定义。
 */
class OrderDefinition<T : Enum<T>>(items: List<AliasDefinition<T, Alias>>) : OrderFieldByIdentify<T>() {
    /**
     * 默认正向排序。
     */
    private val defaultDesc = false
    /**
     * 逐项列出枚举值。
     */
    private val enums = items.map { it.alias.map { s -> s.toString().lowercase() } }
    /**
     * 期望值列表。
     */
    private val expected: List<String> = enums.flatten()
    /**
     * 从[^]name映射到对应的项。
     */
    private val aliasMap: Map<String, AliasDefinition<T, Alias>> = mutableMapOf<String, AliasDefinition<T, Alias>>().also { aliasMap ->
        for (item in items) {
            for (alias in item.alias) {
                val aliasName = alias.toString().lowercase()
                if(aliasName in aliasMap) throw RuntimeException("Order item alias $aliasName is duplicated.")
                aliasMap[aliasName] = item
            }
        }
    }

    override fun generate(subject: StrList, family: Family?, predicative: Predicative?): Orders {
        if(family == null || predicative == null) semanticError(OrderValueRequired(subject.beginIndex, subject.endIndex))
        if(family.value != ":") semanticError(OrderValueMustBeSortList(subject.beginIndex, predicative.endIndex))
        return when (predicative) {
            is StrList -> {
                //由于文法的二义性，单一的str词素会被分析为StrList语法而不是SortList语法，因此这里也要处理StrList节点
                if(predicative.items.size > 1) {
                    //然而，如果StrList的长度超过1，就可以知道用户写的确实是地址段而不是一个简单单词，抛出的错误也是"需要SortList"而不是"不能是地址段"
                    semanticError(OrderValueMustBeSortList(subject.beginIndex, predicative.endIndex))
                }
                listOf(Order(mapOrderItem(predicative.items.first().value, false, predicative.beginIndex, predicative.endIndex), desc = defaultDesc))
            }
            is SortList -> predicative.items.map { Order(mapOrderItem(it.value.value, it.source, it.beginIndex, it.endIndex), mapDirectionDesc(it.direction)) }
            else -> semanticError(OrderValueMustBeSortList(subject.beginIndex, predicative.endIndex))
        }
    }

    override fun forecast(subject: StrList, family: Family?, predicative: Predicative?, cursorIndex: Int): Forecast? {
        return if(predicative != null && cursorIndex >= predicative.beginIndex && cursorIndex <= predicative.endIndex) {
            when(predicative) {
                is StrList -> if(predicative.items.size == 1) {
                    ForecastOrder(predicative.items.first().value, enums, predicative.items.first().beginIndex, predicative.items.first().endIndex)
                }else{
                    null
                }
                is SortList -> {
                    val item = predicative.items.firstOrNull { cursorIndex >= it.beginIndex && cursorIndex <= it.endIndex } ?: return null
                    ForecastOrder(item.value.value, enums, if(item.direction != 0) item.beginIndex + 1 else item.beginIndex, item.endIndex)
                }
                else -> null
            }
        }else{
            null
        }
    }

    private fun mapOrderItem(name: String, sourceFlag: Boolean, beginIndex: Int, endIndex: Int): T {
        val value = aliasToString(name.lowercase(), sourceFlag)
        val key = aliasMap[value] ?: semanticError(InvalidOrderItem(value, expected, beginIndex, endIndex))
        return key.key
    }

    private fun mapDirectionDesc(direction: Int) = when {
        direction > 0 -> false
        direction < 0 -> true
        else -> defaultDesc
    }
}

/**
 * 定义一个排序列表。
 */
inline fun <T : Enum<T>> orderListOf(block: AliasBuilder<T, Alias>.() -> Unit): OrderDefinition<T> {
    return OrderDefinition(buildAlias({ if(it.startsWith("^")) Alias(it.substring(1), true) else Alias(it, false) }, block))
}
