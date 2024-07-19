package com.heerkirov.hedge.server.library.framework

import java.io.Closeable

/**
 * 通用组件。
 * 在系统关闭时，执行组件的close方法以关闭资源。
 */
interface Component : Closeable {
    /**
     * 初始化方法。将在开始执行服务流程的最开始调用。该方法是同步调用的。
     */
    fun load() { }
    override fun close() { }
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