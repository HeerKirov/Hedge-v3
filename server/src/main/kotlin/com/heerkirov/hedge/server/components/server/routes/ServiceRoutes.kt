package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.functions.service.ServiceService
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.config.JavalinConfig
import io.javalin.http.Context


class ServiceRoutes(private val service: ServiceService) : Routes {
    override fun handle(javalin: JavalinConfig) {
        javalin.router.apiBuilder {
            get("api/service/storage", ::getStorageStatus)
        }
    }

    private fun getStorageStatus(ctx: Context) {
        ctx.json(service.getStorageStatus())
    }
}