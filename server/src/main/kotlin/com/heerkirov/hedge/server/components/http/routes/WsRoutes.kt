package com.heerkirov.hedge.server.components.http.routes

import com.heerkirov.hedge.server.components.http.Routes
import com.heerkirov.hedge.server.components.http.WsConsumer
import com.heerkirov.hedge.server.components.lifetime.Lifetime
import io.javalin.Javalin

class WsRoutes(private val lifetime: Lifetime) : Routes {
    override fun handle(javalin: Javalin) {
        javalin.ws("websocket", wsConsumer)
    }

    private val wsConsumer = WsConsumer {
        onConnect { lifetime.session[it] = true }
        onClose { lifetime.session[it] = false }
    }
}