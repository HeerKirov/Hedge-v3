package com.heerkirov.hedge.server.utils.types

import com.heerkirov.hedge.server.enums.FindSimilarEntityType


/**
 * 在find similar model的graph中，用于唯一决定一个对象的key。
 */
data class FindSimilarEntityKey(val type: FindSimilarEntityType, val id: Int) : Comparable<FindSimilarEntityKey> {
    override fun compareTo(other: FindSimilarEntityKey): Int {
        return if(type.index != other.type.index) type.index.compareTo(other.type.index) else id.toString().compareTo(other.id.toString())
    }
}

fun FindSimilarEntityKey.toEntityKeyString(): String {
    return "${type.index}${id}"
}

fun String.toEntityKey(): FindSimilarEntityKey {
    val type = FindSimilarEntityType.values().first { it.index.digitToChar() == this.first() }
    val id = this.substring(1).toInt()
    return FindSimilarEntityKey(type, id)
}