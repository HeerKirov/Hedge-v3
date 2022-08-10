package com.heerkirov.hedge.server.utils.types

import java.util.*

class OrderItem {
    val name: String
    val desc: Boolean

    constructor(itemLine: String) {
        when {
            itemLine.startsWith('+') -> {
                name = itemLine.substring(1)
                desc = false
            }
            itemLine.startsWith('-') -> {
                name = itemLine.substring(1)
                desc = true
            }
            else -> {
                name = itemLine
                desc = false
            }
        }
    }
    constructor(name: String, desc: Boolean) {
        this.name = name
        this.desc = desc
    }

    fun isAscend() = !desc
    fun isDescend() = desc

    override fun equals(other: Any?) = other === this || other is OrderItem && other.name == this.name && other.desc == this.desc
    override fun hashCode() = Objects.hash(name, desc)
}

@Suppress("NOTHING_TO_INLINE")
inline fun ascendingOrderItem(name: String) = OrderItem(name, desc = false)

@Suppress("NOTHING_TO_INLINE")
inline fun descendingOrderItem(name: String) = OrderItem(name, desc = true)