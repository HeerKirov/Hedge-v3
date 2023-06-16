package com.heerkirov.hedge.server.components.http.routes

import com.heerkirov.hedge.server.components.http.Routes
import com.heerkirov.hedge.server.dto.form.ExecuteExportForm
import com.heerkirov.hedge.server.exceptions.ParamTypeError
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.functions.service.ExportUtilService
import com.heerkirov.hedge.server.library.form.bodyAsForm
import io.javalin.Javalin
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.http.Context

class UtilExportRoutes(private val exportUtilService: ExportUtilService) : Routes {
    override fun handle(javalin: Javalin) {
        javalin.routes {
            path("api/utils/export") {
                post("illust-situation", ::getExpandedIllusts)
                post("execute-export", ::executeExport)
            }
        }
    }

    private fun getExpandedIllusts(ctx: Context) {
        val images = try { ctx.bodyAsClass<List<Int>>() } catch (e: Exception) {
            throw be(ParamTypeError("images", e.message ?: "cannot convert to List<Int>"))
        }
        ctx.json(exportUtilService.getExpandedIllusts(images))
    }

    private fun executeExport(ctx: Context) {
        val form = ctx.bodyAsForm<ExecuteExportForm>()
        ctx.json(exportUtilService.executeExport(form))
    }
}