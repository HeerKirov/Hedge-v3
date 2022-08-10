package com.heerkirov.hedge.server.components.bus

import com.heerkirov.hedge.server.events.BaseBusEvent
import com.heerkirov.hedge.server.library.framework.Component
import com.heerkirov.hedge.server.library.framework.FrameworkContext

/**
 * 程序中贯穿所有服务的事件总线。它的职责是收集所有事件，并将事件投送到需要它们的组件/服务处。
 */
interface EventBus : Component {
    fun emit(e: BaseBusEvent)
}

class EventBusImpl(private val context: FrameworkContext) : EventBus {

    override fun emit(e: BaseBusEvent) {
        //TODO emit bus event
    }
}