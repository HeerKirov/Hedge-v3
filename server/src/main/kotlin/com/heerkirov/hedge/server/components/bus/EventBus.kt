package com.heerkirov.hedge.server.components.bus

import com.heerkirov.hedge.server.events.BaseBusEvent
import com.heerkirov.hedge.server.events.PackagedBusEvent
import com.heerkirov.hedge.server.library.framework.Component
import com.heerkirov.hedge.server.library.framework.FrameworkContext
import com.heerkirov.hedge.server.utils.DateTime
import com.heerkirov.hedge.server.utils.DateTime.toMillisecond
import org.slf4j.LoggerFactory
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import kotlin.reflect.KClass
import kotlin.reflect.full.isSuperclassOf

/**
 * 程序中贯穿所有服务的事件总线。它的职责是收集所有事件，并将事件投送到需要它们的组件/服务处。
 */
interface EventBus : Component {
    /**
     * 向事件总线投递事件。
     */
    fun emit(vararg e: BaseBusEvent)

    /**
     * 监听来自事件总线的事件投递。所有的事件都会被接收。
     */
    fun on(consumer: (PackagedBusEvent<*>) -> Unit)

    /**
     * 监听事件投递，并在那之前，按照给定的类型过滤所需要的事件。
     */
    fun <T : BaseBusEvent> on(clazz: KClass<T>, consumer: (PackagedBusEvent<T>) -> Unit)

    /**
     * 监听事件投递，并在那之前，按照给定的类型列表过滤所需要的事件。接口列表采取any规则。
     */
    fun on(vararg clazz: KClass<out BaseBusEvent>, consumer: (PackagedBusEvent<*>) -> Unit)
}

class EventBusImpl(private val context: FrameworkContext) : EventBus {
    private val log = LoggerFactory.getLogger(EventBusImpl::class.java)

    private val clazzMap = ConcurrentHashMap<KClass<out BaseBusEvent>, MutableSet<(PackagedBusEvent<*>) -> Unit>>()
    private val allClazzSet = mutableSetOf<(PackagedBusEvent<*>) -> Unit>()

    private val threadExecutor = Executors.newSingleThreadExecutor()

    override fun emit(vararg e: BaseBusEvent) {
        if(e.isNotEmpty()) {
            val timestamp = DateTime.now().toMillisecond()

            threadExecutor.submit {
                for (event in e) {
                    val consumers = mutableSetOf<(PackagedBusEvent<*>) -> Unit>()
                    consumers.addAll(allClazzSet)

                    for ((clazz, set) in clazzMap) {
                        if(clazz.isSuperclassOf(event::class)) {
                            consumers.addAll(set)
                        }
                    }

                    if(consumers.isNotEmpty()) {
                        val packagedEvent = PackagedBusEvent(event, timestamp)
                        for (consumer in consumers) {
                            try {
                                consumer(packagedEvent)
                            }catch (e: Exception) {
                                log.error("Error occurred in event consumer ${consumer::class}. ", e)
                            }
                        }
                    }
                }
            }
        }
    }

    override fun on(consumer: (PackagedBusEvent<*>) -> Unit) {
        synchronized(allClazzSet) {
            allClazzSet.add(consumer)
        }
    }

    override fun <T : BaseBusEvent> on(clazz: KClass<T>, consumer: (PackagedBusEvent<T>) -> Unit) {
        val set = clazzMap.computeIfAbsent(clazz) { mutableSetOf() }
        synchronized(set) {
            @Suppress("UNCHECKED_CAST")
            set.add(consumer as (PackagedBusEvent<*>) -> Unit)
        }
    }

    override fun on(vararg clazz: KClass<out BaseBusEvent>, consumer: (PackagedBusEvent<*>) -> Unit) {
        for (c in clazz) {
            on(c, consumer)
        }
    }
}