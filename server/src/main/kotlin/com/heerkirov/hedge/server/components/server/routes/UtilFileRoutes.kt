package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.dto.form.ConvertFormat
import com.heerkirov.hedge.server.functions.service.FileUtilService
import com.heerkirov.hedge.server.library.form.bodyAsForm
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.config.JavalinConfig
import io.javalin.http.Context
import io.javalin.http.pathParamAsClass

class UtilFileRoutes(private val fileUtilService: FileUtilService) : Routes {
    override fun handle(javalin: JavalinConfig) {
        javalin.router.apiBuilder {
            path("api/utils/file") {
                get("{id}", ::fileInfo)
                post("convert-format", ::convertFormat)
            }
        }
    }

    private fun fileInfo(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        ctx.json(fileUtilService.getFileInfo(id))
    }

    private fun convertFormat(ctx: Context) {
        val form = ctx.bodyAsForm<ConvertFormat>()
        ctx.json(fileUtilService.convertFormat(form))
    }
}