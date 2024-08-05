package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.dto.form.ExportForm
import com.heerkirov.hedge.server.exceptions.ParamTypeError
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.functions.service.ExportUtilService
import com.heerkirov.hedge.server.library.form.bodyAsForm
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.config.JavalinConfig
import io.javalin.http.ContentType
import io.javalin.http.Context
import io.javalin.http.bodyAsClass

class UtilExportRoutes(private val exportUtilService: ExportUtilService) : Routes {
    override fun handle(javalin: JavalinConfig) {
        javalin.router.apiBuilder {
            path("api/utils/export") {
                post("illust-situation", ::getExpandedIllusts)
                post("download", ::download)
            }
        }
    }

    private fun getExpandedIllusts(ctx: Context) {
        val images = try { ctx.bodyAsClass<List<Int>>() } catch (e: Exception) {
            throw be(ParamTypeError("images", e.message ?: "cannot convert to List<Int>"))
        }
        ctx.json(exportUtilService.getExpandedIllusts(images))
    }

    private fun download(ctx: Context) {
        val form = ctx.bodyAsForm<ExportForm>()
        ctx.contentType(ContentType.APPLICATION_ZIP)
        exportUtilService.downloadExportFile(form, ctx.outputStream())
    }
}