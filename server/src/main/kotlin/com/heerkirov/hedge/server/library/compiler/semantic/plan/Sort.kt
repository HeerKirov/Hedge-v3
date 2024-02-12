package com.heerkirov.hedge.server.library.compiler.semantic.plan


/**
 * 排序列表。其中的排序项有序排布，并指定名称和方向，因此可以翻译为排序指令。
 */
typealias Sorts = List<Sort<*>>

/**
 * 一个排序项。记录排序项的名字和它的方向。
 */
data class Sort<T : Enum<T>>(val value: T, private val desc: Boolean) {
    fun isDescending() = desc
    fun isAscending() = !desc

    override fun toString(): String {
        return "${if(desc) "-" else "+"}$value"
    }
}
