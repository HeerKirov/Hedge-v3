package com.heerkirov.hedge.server.components.http.routes

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.http.Routes
import com.heerkirov.hedge.server.components.http.WsConsumer
import com.heerkirov.hedge.server.components.lifetime.Lifetime
import com.heerkirov.hedge.server.dto.res.WsResult
import com.heerkirov.hedge.server.events.PackagedBusEvent
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

    private fun sendBusEvent(ws: WsConsumer, e: PackagedBusEvent<*>) {
        ws.sendMessage(WsResult("EVENT", e))
    }
}