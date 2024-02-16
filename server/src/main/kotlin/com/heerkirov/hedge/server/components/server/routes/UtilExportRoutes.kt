package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.dto.form.ExecuteExportForm
import com.heerkirov.hedge.server.dto.form.LoadLocalFileForm
import com.heerkirov.hedge.server.exceptions.ParamTypeError
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.functions.service.ExportUtilService
import com.heerkirov.hedge.server.library.form.bodyAsForm
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.config.JavalinConfig
import io.javalin.http.Context
import io.javalin.http.bodyAsClass

class UtilExportRoutes(private val exportUtilService: ExportUtilService) : Routes {
    override fun handle(javalin: JavalinConfig) {
        javalin.router.apiBuilder {
            path("api/utils/export") {
                post("illust-situation", ::getExpandedIllusts)
                post("execute-export", ::executeExport)
                post("load-local-file", ::loadLocalFile)
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

    private fun loadLocalFile(ctx: Context) {
        val form = ctx.bodyAsForm<LoadLocalFileForm>()
        ctx.json(exportUtilService.loadLocalFile(form.filepath))
    }
}