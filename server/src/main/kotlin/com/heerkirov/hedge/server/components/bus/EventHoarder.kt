package com.heerkirov.hedge.server.components.bus

import com.heerkirov.hedge.server.events.ItemBusEvent
import com.heerkirov.hedge.server.utils.tools.loopPoolThread
import java.util.LinkedList
import java.util.concurrent.ConcurrentHashMap

/**
 * 事件囤积器。
 * 将同类的事件囤积在一起。经过一定时间的延迟后，统一调用发出。
 */
class EventHoarder<T>(private val emit: (Array<ItemBusEvent<*>>) -> Unit) {
    private val interval = 50L
    private val collectMap = ConcurrentHashMap<T, LinkedList<ItemBusEvent<*>>>()
    private val timer = loopPoolThread(thread = ::tickThread)
    private val timerQueue = LinkedList<QueueItem<T>>()

    fun collect(type: T, element: ItemBusEvent<*>) {
        val collection = collectMap.computeIfAbsent(type) { LinkedList<ItemBusEvent<*>>() }

        synchronized(collection) {
            collection.add(element)
        }

        synchronized<Unit>(timerQueue) {
            if(timerQueue.isEmpty()) {
                val now = System.currentTimeMillis()
                timerQueue.add(QueueItem(type, interval, now))
            }else if(timerQueue.all { it.type != type }) {
                val now = System.currentTimeMillis()
                val lastTickTime = timerQueue.last().tickTime
                val interval = if(now - lastTickTime > interval) interval else now - lastTickTime
                timerQueue.add(QueueItem(type, interval, now))
            }
        }

        if(!timer.isAlive) timer.start()
    }

    private fun tickThread() {
        val (type, interval, _) = synchronized(timerQueue) {
            timerQueue.peek() ?: run {
                timer.stop()
                return
            }
        }

        try {
            Thread.sleep(interval)
        }catch (e: InterruptedException) {
            return
        }

        timerQueue.pop()

        val collection = collectMap[type]
        if(!collection.isNullOrEmpty()) {
            synchronized(collection) {
                collection.toTypedArray().also { collection.clear() }
            }.also {
                if(it.isNotEmpty()) {
                    emit(it)
                }
            }
        }else{
            println("Event ticked: type=$type, size=0, now=${System.currentTimeMillis()}")
        }
    }

    private data class QueueItem<T>(val type: T, val interval: Long, val tickTime: Long)
}