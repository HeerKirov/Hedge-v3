package com.heerkirov.hedge.server.library.compiler.semantic.plan

/**
 * 查询计划实例。
 */
data class QueryPlan(
    /**
     * 排序计划。由order关键字导出的排序指令。
     */
    val orders: Orders,
    /**
     * 过滤器。由特定关键字导出的过滤指令。
     */
    val filters: IntersectFilters,
    /**
     * 连接元素项。不由关键字导出的元素集合，包括标签、注解等。
     */
    val elements: Elements
) {
    override fun toString(): String {
        return "{\n\torders=[${orders.joinToString(", ")}]\n\tfilters=[${filters.joinToString(",\n\t\t", "\n\t\t", "\n\t")}]\n\telements=[${elements.joinToString(",\n\t\t", "\n\t\t", "\n\t")}]\n}"
    }
}