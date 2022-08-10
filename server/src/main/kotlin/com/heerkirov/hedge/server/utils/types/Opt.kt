package com.heerkirov.hedge.server.utils.types

import java.util.*

/**
 * 主要作用是在partial update表单中充当存在标示器。当一个字段类型标记为Opt<T>?时，将特殊处理此字段，当找不到此字段的值时，填入Opt::null，否则填入Opt::some。
 */
class Opt<T> {
    private val v: T?
    private val has: Boolean

    constructor(v: T) {
        this.v = v
        this.has = true
    }
    constructor() {
        this.v = null
        this.has = false
    }

    override fun equals(other: Any?) = other is Opt<*> && other.has == this.has && other.v == this.v

    override fun hashCode() = Objects.hash(has, v)

    val isPresent get() = has

    val isUndefined get() = !has

    val value: T get() = if(has) {
        @Suppress("UNCHECKED_CAST")
        v as T
    }else throw NullPointerException("Opt is undefined.")

    /**
     * 断言值存在并解包，并将值map为一个新值。
     */
    inline fun <R> unwrap(call: T.() -> R): R = value.call()

    /**
     * 解包。如果值不存在，应用一个新值。
     */
    inline fun unwrapOr(call: () -> T): T = if(isPresent) value else call()

    /**
     * 解包。如果值不存在，返回null。
     */
    fun unwrapOrNull(): T? = if(isPresent) value else null

    /**
     * 如果值存在，计算一个新值。参数使用this传递。
     */
    inline fun <R> runOpt(call: T.() -> R): Opt<R> = if(isPresent) Opt(value.call()) else {
        @Suppress("UNCHECKED_CAST")
        this as Opt<R>
    }

    /**
     * 如果值存在，计算一个新值。
     */
    inline fun <R> letOpt(call: (T) -> R): Opt<R> = if(isPresent) Opt(call(value)) else {
        @Suppress("UNCHECKED_CAST")
        this as Opt<R>
    }

    /**
     * 如果值不存在，执行函数生成一个新值。
     */
    inline fun elseOr(call: () -> T): Opt<T> = if(isUndefined) Opt(call()) else this

    /**
     * 如果值存在，执行一段代码。
     */
    inline fun alsoOpt(call: (T) -> Unit): Opt<T> {
        if(isPresent) call(value)
        return this
    }

    /**
     * 如果值存在，执行一段代码。参数使用this传递。
     */
    inline fun applyOpt(call: T.() -> Unit): Opt<T> {
        if(isPresent) value.call()
        return this
    }
}

private val undefinedRef = Opt<Any?>()

fun <T> optOf(value: T) = Opt(value)

fun <T> undefined(): Opt<T> {
    @Suppress("UNCHECKED_CAST")
    return undefinedRef as Opt<T>
}

fun anyOpt(vararg opts: Opt<*>): Boolean {
    for (opt in opts) {
        if(opt.isPresent) return true
    }
    return false
}