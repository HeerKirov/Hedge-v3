package com.heerkirov.hedge.server.events

/**
 * 所有总线事件的基类。
 */
interface BaseBusEvent {
    /**
     * 该事件发生的基准事件点。
     */
    val timestamp: Long
}
