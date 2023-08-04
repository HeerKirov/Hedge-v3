package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.functions.service.ServiceService
import io.javalin.Javalin
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.http.Context


class ServiceRoutes(private val service: ServiceService) : Routes {
    override fun handle(javalin: Javalin) {
        javalin.routes {
            get("api/service/storage", ::getStorageStatus)
        }
    }

    private fun getStorageStatus(ctx: Context) {
        ctx.json(service.getStorageStatus())
    }
}