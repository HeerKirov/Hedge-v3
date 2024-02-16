package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.functions.service.FileUtilService
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.config.JavalinConfig
import io.javalin.http.Context
import io.javalin.http.pathParamAsClass

class UtilFileRoutes(private val fileUtilService: FileUtilService) : Routes {
    override fun handle(javalin: JavalinConfig) {
        javalin.router.apiBuilder {
            path("api/utils/file") {
                post("{id}/convert-format", ::convertFormat)
            }
        }
    }

    private fun convertFormat(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        ctx.json(fileUtilService.convertFormat(id))
    }
}