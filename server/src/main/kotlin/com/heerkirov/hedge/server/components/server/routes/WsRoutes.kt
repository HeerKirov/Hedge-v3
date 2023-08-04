package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.components.server.WsConsumer
import com.heerkirov.hedge.server.components.lifetime.Lifetime
import com.heerkirov.hedge.server.dto.res.WsResult
import com.heerkirov.hedge.server.events.InternalServerEvent
import com.heerkirov.hedge.server.events.PackagedBusEvent
import com.heerkirov.hedge.server.events.WsBusEvent
import io.javalin.Javalin

class WsRoutes(private val lifetime: Lifetime, private val bus: EventBus) : Routes {
    private val limit = 1000

    override fun handle(javalin: Javalin) {
        javalin.ws("websocket", wsConsumer)
    }

    private val wsConsumer = WsConsumer {
        onConnect { lifetime.session[it] = true }
        onClose { lifetime.session[it] = false }
        bus.on { sendBusEvent(this, it) }
    }

    private fun sendBusEvent(ws: WsConsumer, e: PackagedBusEvent) {
        if(e.events.first().event is InternalServerEvent) {
            //InternalServerEvent类型的事件，不会被发送到外部
            return
        }
        if(e.events.size > limit) {
            e.events.asSequence().chunked(limit).forEach {
                val event = WsBusEvent(e.eventType, it)
                ws.sendMessage(WsResult("EVENT", event))
            }
        }else{
            val event = WsBusEvent(e.eventType, e.events.toList())
            ws.sendMessage(WsResult("EVENT", event))
        }
    }
}