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

    init {
        log.info("Start hedge server.")

        Runtime.getRuntime().addShutdownHook(thread(name = "shutdown", start = false) {
            log.info("Shutdown.")
            components.asReversed().forEach { it.close() }
        })
    }

    fun <T : Component> addComponent(component: T) {
        components.add(component)
    }

    /**
     * 开始执行服务。
     * 首先调用load方法，将各个组件初始化。
     * 随后调用线程组件。
     */
    fun start() {
        components.forEach { it.load() }
        components.filterIsInstance<DaemonThreadComponent>().forEach { thread(isDaemon = true) { it.thread() } }
        components.filterIsInstance<MainThreadComponent>().firstOrNull()?.thread()
        //最后，发送关闭指令。不沿执行流程自动退出是因为其他组件可能持有非背景线程，这些线程会阻止shutdown的发生。
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