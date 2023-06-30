package com.heerkirov.hedge.server.components.http.routes

import com.heerkirov.hedge.server.components.http.Routes
import com.heerkirov.hedge.server.functions.service.HomepageService
import io.javalin.Javalin
import io.javalin.apibuilder.ApiBuilder.get
import io.javalin.apibuilder.ApiBuilder.path
import io.javalin.http.Context

class HomepageRoutes(private val service: HomepageService) : Routes {
    override fun handle(javalin: Javalin) {
        javalin.routes {
            path("api/homepage") {
                get(::homepage)
                get("state", ::homepageState)
            }
        }
    }

    private fun homepage(ctx: Context) {
        ctx.json(service.getHomepageInfo())
    }

    private fun homepageState(ctx: Context) {
        ctx.json(service.getHomepageState())
    }
}