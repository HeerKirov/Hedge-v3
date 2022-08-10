package com.heerkirov.hedge.server.library.compiler.utils

data class IndexRange(val begin: Int, val end: Int? = null) {
    override fun toString(): String {
        return if(end == null) return begin.toString() else "$begin->$end"
    }
}

fun range(begin: Int, end: Int? = null) = IndexRange(begin, end)