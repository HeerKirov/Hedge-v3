package com.heerkirov.hedge.server.library.framework

import java.io.Closeable

/**
 * 通用组件。
 * 在系统关闭时，执行组件的close方法以关闭资源。
 */
interface Component : Closeable {
    fun load() { }
    override fun close() { }
}

/**
 * 有状态的组件。特点是可能在自身内部维护状态，表现为其空闲标记。
 * 当存在非空闲的组件时，系统不应该被shutdown。
 */
interface StatefulComponent : Component {
    /**
     * 判断当前组件是否空闲。
     */
    val isIdle: Boolean
}

/**
 * 背景线程组件，框架会在初始化结束后调用这些线程，并背景执行。
 */
interface DaemonThreadComponent : Component {
    fun thread()
}

/**
 * 主程组件，框架会在初始化结束后调用此程序，并等待其执行完毕后，发出程序退出信号。
 */
interface MainThreadComponent : Component {
    fun thread()
}