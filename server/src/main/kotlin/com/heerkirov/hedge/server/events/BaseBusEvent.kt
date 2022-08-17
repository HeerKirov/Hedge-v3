package com.heerkirov.hedge.server.events

/**
 * 经过包装的总线事件。除了事件类以外，还包括了相关的元信息，如事件发出时间。
 */
data class PackagedBusEvent<T : BaseBusEvent>(val event: T, val timestamp: Long)

/**
 * 所有总线事件的基类。各种抽象事件接口也应该继承这个接口。
 */
interface BaseBusEvent {
    val eventType: String
}

open class BaseBusEventImpl(override val eventType: String) : BaseBusEvent
