package com.heerkirov.hedge.server.utils.ktorm

import com.heerkirov.hedge.server.exceptions.ParamTypeError
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.utils.types.OrderItem
import org.ktorm.dsl.*
import org.ktorm.expression.OrderByExpression
import org.ktorm.schema.ColumnDeclaring

/**
 * 提供一个工具类，方便地将在filter order属性中string定义的列转换为Ktorm列，并快速提取。
 */
class OrderTranslator(private val orderFieldName: String = "order", initializer: Builder.() -> Unit) {
    private val map: HashMap<String, ColumnDefinition> = hashMapOf()

    init { initializer(Builder()) }

    inner class Builder {
        val first = NullDefinition.FIRST
        val last = NullDefinition.LAST

        infix fun String.to(column: ColumnDeclaring<*>): ColumnDefinition {
            val columnDefinition = ColumnDefinition(column)
            map[this] = columnDefinition
            return columnDefinition
        }
        infix fun ColumnDefinition.nulls(nullDefinition: NullDefinition) {
            this.nullDefinition = nullDefinition
        }
    }

    enum class NullDefinition {
        FIRST, LAST
    }

    inner class ColumnDefinition(val column: ColumnDeclaring<*>) {
        var nullDefinition: NullDefinition? = null
    }

    operator fun get(field: String, direction: Int): OrderByExpression {
        val column = map[field] ?: throw be(ParamTypeError(orderFieldName, "cannot accept value '$field'."))
        return if(direction > 0) {
            column.column.asc()
        }else{
            column.column.desc()
        }
    }

    fun orderFor(orders: List<OrderItem>): Array<OrderByExpression> {
        return orders.flatMap(::orderFor).toTypedArray()
    }

    fun orderFor(order: OrderItem): List<OrderByExpression> {
        val column = map[order.name] ?: throw be(ParamTypeError(orderFieldName, "cannot accept value '${order.name}'."))
        val orderByExpression = if(order.desc) {
            column.column.desc()
        }else{
            column.column.asc()
        }
        return if(column.nullDefinition != null) {
            arrayListOf(column.column.isNull().asc(), orderByExpression)
        }else{
            arrayListOf(orderByExpression)
        }
    }
}

/**
 * 综合处理从query filter中、从query schema中取得的排序参数以及默认参数。
 * 策略：
 * 1. 没有任何参数时，使用默认参数。
 * 2. 只给出了query filter时，使用query filter参数。
 * 3. 给出query schema时，只使用query schema参数。也就是来自query schema的参数总是最高优先级且排除其他的参数。
 */
fun Query.orderBy(translator: OrderTranslator, filterOrders: List<OrderItem>?, schemaOrders: List<OrderByExpression>? = null, default: OrderItem? = null): Query {
    val arr = translator.toOrderByExpressions(filterOrders, schemaOrders, default)
    return if(arr.isEmpty()) this else this.orderBy(*arr)
}

/**
 * 综合处理从query filter中、从query schema中取得的排序参数以及默认参数。
 * 策略：
 * 1. 没有任何参数时，使用默认参数。
 * 2. 只给出了query filter时，使用query filter参数。
 * 3. 给出query schema时，只使用query schema参数。也就是来自query schema的参数总是最高优先级且排除其他的参数。
 */
fun OrderTranslator.toOrderByExpressions(filterOrders: List<OrderItem>?, schemaOrders: List<OrderByExpression>? = null, default: OrderItem? = null): Array<OrderByExpression> {
    return if(!schemaOrders.isNullOrEmpty()) {
        schemaOrders.toTypedArray()
    }else if(!filterOrders.isNullOrEmpty()) {
        this.orderFor(filterOrders)
    }else if(default != null) {
        this.orderFor(default).toTypedArray()
    }else{
        emptyArray()
    }
}