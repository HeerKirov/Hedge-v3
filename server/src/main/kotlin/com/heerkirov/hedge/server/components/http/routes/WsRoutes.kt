package com.heerkirov.hedge.server.components.http.routes

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.http.Routes
import com.heerkirov.hedge.server.components.http.WsConsumer
import com.heerkirov.hedge.server.components.lifetime.Lifetime
import com.heerkirov.hedge.server.dto.res.WsResult
import com.heerkirov.hedge.server.events.PackagedBusEvent
import com.heerkirov.hedge.server.events.WsBusEvent
import io.javalin.Javalin

class WsRoutes(private val lifetime: Lifetime, private val bus: EventBus) : Routes {
    override fun handle(javalin: Javalin) {
        javalin.ws("websocket", wsConsumer)
    }

    private val wsConsumer = WsConsumer {
        onConnect { lifetime.session[it] = true }
        onClose { lifetime.session[it] = false }
        bus.on { sendBusEvent(this, it) }
    }

    private fun sendBusEvent(ws: WsConsumer, e: PackagedBusEvent) {
        val limit = 1000
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