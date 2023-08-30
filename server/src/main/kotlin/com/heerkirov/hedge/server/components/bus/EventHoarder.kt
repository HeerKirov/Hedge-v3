package com.heerkirov.hedge.server.components.bus

import com.heerkirov.hedge.server.events.ItemBusEvent
import java.util.LinkedList
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

/**
 * 事件囤积器。
 * 将同类的事件囤积在一起。经过一定时间的延迟后，统一调用发出。
 */
class EventHoarder<T>(private val emit: (Array<ItemBusEvent<*>>) -> Unit) {
    private val interval = 50L
    private val collectMap = ConcurrentHashMap<T, LinkedList<ItemBusEvent<*>>>()
    private val pool = Executors.newSingleThreadScheduledExecutor()
    @Volatile private var future: ScheduledFuture<*>? = null
    private val count = AtomicInteger(0)

    fun collect(type: T, element: ItemBusEvent<*>) {
        val collection = collectMap.computeIfAbsent(type) { LinkedList<ItemBusEvent<*>>() }

        synchronized(collection) {
            collection.add(element)
        }
        count.getAndIncrement()

        if(future == null) {
            synchronized(this) {
                if (future == null) {
                    future = pool.scheduleWithFixedDelay(::tickThread, interval, interval, TimeUnit.MILLISECONDS)
                }
            }
        }
    }

    private fun tickThread() {
        if(count.get() <= 0) {
            synchronized(this) {
                if(count.get() <= 0) {
                    future?.cancel(false)
                    future = null
                    if(count.get() > 0) {
                        future = pool.scheduleWithFixedDelay(::tickThread, interval, interval, TimeUnit.MILLISECONDS)
                    }
                    return
                }
            }
        }
        for (collection in collectMap.values) {
            if(collection.isNotEmpty()) {
                val polledEvents = synchronized(collection) {
                    val ret = collection.toTypedArray()
                    collection.clear()
                    ret
                }
                if(polledEvents.isNotEmpty()) {
                    count.getAndAdd(-polledEvents.size)
                    emit(polledEvents)
                }
            }
        }
    }
}