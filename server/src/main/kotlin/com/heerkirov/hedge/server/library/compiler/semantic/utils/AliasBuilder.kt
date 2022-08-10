package com.heerkirov.hedge.server.library.compiler.semantic.utils

/**
 * 别名映射的构建器。
 */
class AliasBuilder<T, A>(private val list: MutableList<AliasDefinition<T, A>>, private val mapper: (String) -> A) {
    fun item(key: T, vararg alias: String) {
        list.add(AliasDefinition(key, alias.map(mapper)))
    }
}

/**
 * 一个别名定义。
 * @param name 名称
 * @param sourceFlag 需要^符号定义
 */
data class Alias(val name: String, val sourceFlag: Boolean = false) {
    override fun toString(): String {
        return aliasToString(name, sourceFlag)
    }
}

/**
 * 一个项及其别名定义。
 * @param key 输出的查询计划中的定义名称。
 * @param alias 从语义树获取的名称。需要注意key不在获取名称中。
 */
data class AliasDefinition<T, A>(val key: T, val alias: List<A>)

/**
 * 调用块以构建一个别名定义列表。
 */
inline fun <T, A> buildAlias(noinline mapper: (String) -> A, block: AliasBuilder<T, A>.() -> Unit): List<AliasDefinition<T, A>> {
    return mutableListOf<AliasDefinition<T, A>>().also { AliasBuilder(it, mapper).block() }
}

/**
 * 快速构建别名类型为String的别名定义列表。
 */
inline fun <T> buildAlias(block: AliasBuilder<T, String>.() -> Unit): List<AliasDefinition<T, String>> {
    return buildAlias({ it }, block)
}

/**
 * 将别名定义打印为字符串显示。
 */
@Suppress("NOTHING_TO_INLINE")
inline fun aliasToString(name: String, sourceFlag: Boolean): String {
    return (if(sourceFlag) "^" else "") + name
}