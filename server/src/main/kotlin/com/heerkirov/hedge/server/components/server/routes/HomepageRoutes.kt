package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.functions.service.HomepageService
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.config.JavalinConfig
import io.javalin.http.Context

class HomepageRoutes(private val service: HomepageService) : Routes {
    override fun handle(javalin: JavalinConfig) {
        javalin.router.apiBuilder {
            path("api/homepage") {
                get(::homepage)
                get("state", ::homepageState)
                get("background-tasks", ::backgroundTasks)
                post("background-tasks/clean", ::cleanCompletedBackgroundTask)
            }
        }
    }

    private fun homepage(ctx: Context) {
        ctx.json(service.getHomepageInfo())
    }

    private fun homepageState(ctx: Context) {
        ctx.json(service.getHomepageState())
    }

    private fun backgroundTasks(ctx: Context) {
        ctx.json(service.getBackgroundTasks())
    }

    private fun cleanCompletedBackgroundTask(ctx: Context) {
        service.cleanCompletedBackgroundTask()
        ctx.status(204)
    }
}