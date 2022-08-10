package com.heerkirov.hedge.server.utils.tools


class Deferrable(private val completes: MutableList<() -> Unit>,
                 private val catches: MutableList<() -> Unit>,
                 private val finals: MutableList<() -> Unit>) {
    /**
     * 作用域内没有异常而正常离开时。相当于业务代码后的追加代码。
     */
    fun returns(action: () -> Unit) {
        completes.add(action)
    }

    /**
     * 作用域内抛出异常而离开时，执行此块。相当于catch，但是不在意异常的内容。
     */
    fun except(action: () -> Unit) {
        catches.add(action)
    }

    /**
     * 作用域退出时，无论如何都会执行此块。相当于finally。
     */
    fun defer(action: () -> Unit) {
        finals.add(action)
    }

    fun <T> T.applyReturns(action: T.() -> Unit): T {
        completes.add { this.action() }
        return this
    }

    fun <T> T.applyExcept(action: T.() -> Unit): T {
        catches.add { this.action() }
        return this
    }

    fun <T> T.applyDefer(action: T.() -> Unit): T {
        finals.add { this.action() }
        return this
    }

    fun <T> T.alsoReturns(action: (T) -> Unit): T {
        completes.add { action(this) }
        return this
    }

    fun <T> T.alsoExcept(action: (T) -> Unit): T {
        catches.add { action(this) }
        return this
    }
}

/**
 * 启动一个延后作用的作用域。
 * 在作用域中，使用defer和except函数注册当退出作用域时执行的内容。
 * 本质上仍相当于try catch finally结构，但是使用更加类似Go/Swift的defer模式体现。
 */
inline fun <T> defer(block: Deferrable.() -> T): T {
    val completes: MutableList<() -> Unit> = mutableListOf()
    val catches: MutableList<() -> Unit> = mutableListOf()
    val finals: MutableList<() -> Unit> = mutableListOf()
    val deferrable = Deferrable(completes, catches, finals)
    try {
        val ret = deferrable.block()
        if(completes.isNotEmpty()) completes.asReversed().forEach { it() }
        return ret
    }catch (e: Throwable) {
        if(catches.isNotEmpty()) catches.asReversed().forEach { it() }
        throw e
    }finally{
        if(finals.isNotEmpty()) finals.asReversed().forEach { it() }
    }
}