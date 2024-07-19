package com.heerkirov.hedge.server.library.framework

import org.slf4j.Logger
import org.slf4j.LoggerFactory
import java.lang.RuntimeException
import java.util.*
import kotlin.collections.ArrayList
import kotlin.concurrent.thread
import kotlin.reflect.KClass
import kotlin.reflect.full.allSuperclasses
import kotlin.system.exitProcess

class Framework {
    private val log: Logger = LoggerFactory.getLogger(Framework::class.java)

    private val components: MutableList<Component> = LinkedList()

    val context = FrameworkContextImpl()

    private val exceptions: MutableList<Exception> = ArrayList()

    fun <T : Component> addComponent(component: T) {
        components.add(component)
    }

    /**
     * 开始执行服务。
     */
    fun start() {
        log.info("Start hedge server.")
        //在开始之前，先添加一个关闭钩子，在任意情况下进程即将退出时触发，将依次关闭所有组件
        Runtime.getRuntime().addShutdownHook(thread(name = "shutdown", start = false) {
            log.info("Shutdown.")
            components.asReversed().forEach { it.close() }
        })
        //首先依次调用每个组件的load函数，将各个组件同步初始化
        components.forEach { it.load() }
        //随后在开始主程之前，依次调用所有背景线程组件的thread方法，将这些组件异步启动起来
        components.filterIsInstance<DaemonThreadComponent>().forEach { thread(isDaemon = true) { it.thread() } }
        //随后，找到主程组件，调用主程的thread方法，进入程序维持期
        components.filterIsInstance<MainThreadComponent>().firstOrNull()?.thread()
        //主程已结束，发送关闭指令。不沿执行流程自动退出是因为其他组件可能持有非背景线程，这些线程会阻止shutdown的发生
        exitProcess(0)
    }

    inner class FrameworkContextImpl : FrameworkContext {
        override fun <T : Component> getComponent(target: KClass<T>): T {
            for (component in components) {
                val clazz = component::class
                if(target == clazz || clazz.allSuperclasses.any { it == target }) {
                    @Suppress("UNCHECKED_CAST")
                    return component as T
                }
            }
            throw RuntimeException("Component $target not found in framework.")
        }

        override fun getComponents(): List<Component> = this@Framework.components

        override fun getExceptions(): List<Exception> = this@Framework.exceptions
    }
}

inline fun <T : Component> Framework.define(call:() -> T): T {
    val component = call()
    addComponent(component)
    return component
}

inline fun framework(block: Framework.() -> Unit) {
    val framework = Framework()
    framework.block()
    framework.start()
}