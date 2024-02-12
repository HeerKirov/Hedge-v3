package com.heerkirov.hedge.server.library.compiler.semantic.framework


/**
 * 查询方言的定义框架。
 */
interface QueryDialect<SORT : Enum<SORT>> {
    val sort: SortFieldDefinition<SORT>? get() = null
    val elements: Array<out ElementFieldDefinition>
}
