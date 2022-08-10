package com.heerkirov.hedge.server.library.compiler.utils

import java.util.*

/**
 * 专门的error收集器，方便收集错误和警告。
 */
class ErrorCollector<E : CompileError<*>> {
    private var warningList: MutableList<E>? = null
    private var errorList: MutableList<E>? = null

    fun warning(e: E): ErrorCollector<E> {
        if(warningList == null) warningList = LinkedList()
        warningList!!.add(e)
        return this
    }

    fun error(e: E): ErrorCollector<E> {
        if(errorList == null) errorList = LinkedList()
        errorList!!.add(e)
        return this
    }

    fun collect(collector: ErrorCollector<E>): ErrorCollector<E> {
        if(collector.warningList != null) {
            if(this.warningList == null) this.warningList = LinkedList()
            this.warningList!!.addAll(collector.warningList!!)
        }
        if(collector.errorList != null) {
            if(this.errorList == null) this.errorList = LinkedList()
            this.errorList!!.addAll(collector.errorList!!)
        }
        return this
    }

    val hasWarnings: Boolean get() = warningList != null
    val hasErrors: Boolean get() = errorList != null

    val warnings: List<E> get() = warningList ?: emptyList()
    val errors: List<E> get() = errorList ?: emptyList()
}