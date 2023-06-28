package com.heerkirov.hedge.server.events

/**
 * 除了事件类以外，还包括了相关的元信息，如事件发出时间。
 */
data class ItemBusEvent<T : BaseBusEvent>(val event: T, val timestamp: Long)

/**
 * 用于发送到Ws的事件包装。
 */
data class WsBusEvent(val eventType: String, val events: List<ItemBusEvent<*>>)

/**
 * 打包的事件集合。同一个事件集合内的事件都是相同类型的。
 */
class PackagedBusEvent(val events: Array<ItemBusEvent<*>>) {
    val eventType get() = events.first().event.eventType

    inline fun which(lambda: WhichContext.() -> Unit) {
        WhichContext().lambda()
    }

    inner class WhichContext {
        inline fun <reified T : BaseBusEvent> each(call: (e: T) -> Unit) {
            if(events.first().event is T) {
                @Suppress("UNCHECKED_CAST")
                val castEvents = events as Array<ItemBusEvent<T>>
                for (itemBusEvent in castEvents) {
                    call(itemBusEvent.event)
                }
            }
        }

        inline fun <reified T : BaseBusEvent> each(condition: ((e: T) -> Boolean), call: (e: T) -> Unit) {
            if(events.first().event is T) {
                @Suppress("UNCHECKED_CAST")
                val castEvents = events as Array<ItemBusEvent<T>>
                for (itemBusEvent in castEvents) {
                    if(condition(itemBusEvent.event)) {
                        call(itemBusEvent.event)
                    }
                }
            }
        }

        inline fun <reified T : BaseBusEvent> all(call: (events: Collection<T>) -> Unit) {
            if(events.first().event is T) {
                @Suppress("UNCHECKED_CAST")
                val castEvents = events as Array<ItemBusEvent<T>>
                call(castEvents.map { it.event })
            }
        }

        inline fun <reified T : BaseBusEvent> all(condition: ((e: T) -> Boolean), call: (events: Collection<T>) -> Unit) {
            if(events.first().event is T) {
                @Suppress("UNCHECKED_CAST")
                val castEvents = events as Array<ItemBusEvent<T>>
                call(castEvents.map { it.event }.filter(condition))
            }
        }
    }
}

/**
 * 所有总线事件的基类。各种抽象事件接口也应该继承这个接口。
 * 事件系统设计准则：
 * - 事件系统有两个主要作用：通知前端相关变更，通知其他后台组件尤其是backendExporter。
 * - 在事件的相关属性中，可以看到后缀Updated以及后缀Sot的属性。
 * - Updated：此属性面向前端，根据功能模块不同来区分不同的类型。
 * - Sot：此属性面向{事件合成}系统和后台组件，根据属性来区分不同的类型。
 * - 只有Sot事件会参与{事件合成}。Updated事件只能作为合成结果。这是为了明确事件传播脉络，防止循环事件。
 * - 对关联关系进行更替(如parent collection、children images)的操作不能合成，它们要和原事件同步发出。
 */
interface BaseBusEvent {
    val eventType: String
}

open class BaseBusEventImpl(override val eventType: String) : BaseBusEvent
