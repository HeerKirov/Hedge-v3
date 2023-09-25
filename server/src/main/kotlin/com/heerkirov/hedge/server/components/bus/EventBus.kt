package com.heerkirov.hedge.server.components.bus

import com.heerkirov.hedge.server.events.BaseBusEvent
import com.heerkirov.hedge.server.events.ItemBusEvent
import com.heerkirov.hedge.server.events.PackagedBusEvent
import com.heerkirov.hedge.server.library.framework.Component
import org.slf4j.LoggerFactory
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import kotlin.reflect.KClass
import kotlin.reflect.full.isSuperclassOf

/**
 * 程序中贯穿所有服务的事件总线。它的职责是收集所有事件，并将事件投送到需要它们的组件/服务处。
 */
interface EventBus : Component {
    /**
     * 向事件总线投递事件。
     */
    fun emit(e: BaseBusEvent)

    /**
     * 向事件总线投递事件。
     */
    fun emit(e: Collection<BaseBusEvent>)

    /**
     * 监听来自事件总线的事件投递，并绕过事件总线的收集器，同步发送至接收者。
     */
    fun onImmediate(consumer: (ItemBusEvent<*>) -> Unit)

    /**
     * 监听来自事件总线的事件投递。所有的事件都会被接收。
     */
    fun on(consumer: (PackagedBusEvent) -> Unit)

    /**
     * 监听事件投递，并在那之前，按照给定的类型过滤所需要的事件。
     */
    fun <T : BaseBusEvent> on(clazz: KClass<T>, consumer: (PackagedBusEvent) -> Unit)

    /**
     * 监听事件投递，并在那之前，按照给定的类型列表过滤所需要的事件。接口列表采取any规则。
     */
    fun on(clazz: Array<out KClass<out BaseBusEvent>>, consumer: (PackagedBusEvent) -> Unit)
}

class EventBusImpl : EventBus {
    private val log = LoggerFactory.getLogger(EventBusImpl::class.java)

    private val classMap = ConcurrentHashMap<KClass<out BaseBusEvent>, MutableSet<(PackagedBusEvent) -> Unit>>()
    private val allSet = mutableSetOf<(PackagedBusEvent) -> Unit>()
    private val immediateSet = mutableSetOf<(ItemBusEvent<*>) -> Unit>()

    private val eventHoarder = EventHoarder<String>(::sendToConsumer)

    override fun emit(e: BaseBusEvent) {
        val timestamp = Instant.now().toEpochMilli()

        val packagedEvent = ItemBusEvent(e, timestamp)
        eventHoarder.collect(e.eventType, packagedEvent)

        for (consumer in immediateSet) {
            try {
                consumer(packagedEvent)
            }catch (e: Exception) {
                log.error("Error occurred in event consumer ${consumer::class}. ", e)
            }
        }
    }

    override fun emit(e: Collection<BaseBusEvent>) {
        if(e.isNotEmpty()) {
            val timestamp = Instant.now().toEpochMilli()

            for (baseBusEvent in e) {
                val packagedEvent = ItemBusEvent(baseBusEvent, timestamp)
                eventHoarder.collect(baseBusEvent.eventType, packagedEvent)

                for (consumer in immediateSet) {
                    try {
                        consumer(packagedEvent)
                    }catch (e: Exception) {
                        log.error("Error occurred in event consumer ${consumer::class}. ", e)
                    }
                }
            }
        }
    }

    private fun sendToConsumer(events: Array<ItemBusEvent<*>>) {
        val eventClazz = events.first().event::class
        val consumers = mutableSetOf<(PackagedBusEvent) -> Unit>()
        consumers.addAll(allSet)
        for ((clazz, set) in classMap) {
            if(clazz.isSuperclassOf(eventClazz)) {
                consumers.addAll(set)
            }
        }

        if(consumers.isNotEmpty()) {
            val packagedEvent = PackagedBusEvent(events)
            for (consumer in consumers) {
                try {
                    consumer(packagedEvent)
                }catch (e: Exception) {
                    log.error("Error occurred in event consumer ${consumer::class}. ", e)
                }
            }
        }
    }

    override fun onImmediate(consumer: (ItemBusEvent<*>) -> Unit) {
        synchronized(immediateSet) {
            immediateSet.add(consumer)
        }
    }

    override fun on(consumer: (PackagedBusEvent) -> Unit) {
        synchronized(allSet) {
            allSet.add(consumer)
        }
    }

    override fun <T : BaseBusEvent> on(clazz: KClass<T>, consumer: (PackagedBusEvent) -> Unit) {
        val set = classMap.computeIfAbsent(clazz) { mutableSetOf() }
        synchronized(set) {
            @Suppress("UNCHECKED_CAST")
            set.add(consumer)
        }
    }

    override fun on(clazz: Array<out KClass<out BaseBusEvent>>, consumer: (PackagedBusEvent) -> Unit) {
        for (c in clazz) {
            on(c, consumer)
        }
    }
}