package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.dto.filter.BlockFileListFilter
import com.heerkirov.hedge.server.dto.filter.BlockStorageListFilter
import com.heerkirov.hedge.server.functions.service.FileStorageService
import com.heerkirov.hedge.server.library.form.queryAsFilter
import io.javalin.apibuilder.ApiBuilder.get
import io.javalin.apibuilder.ApiBuilder.path
import io.javalin.config.JavalinConfig
import io.javalin.http.Context

class FileStorageRoutes(private val fileStorageService: FileStorageService) : Routes {
    override fun handle(javalin: JavalinConfig) {
        javalin.router.apiBuilder {
            path("api/file") {
                get("blocks", ::listBlocks)
                get("blocks/{block}/files", ::listBlockFiles)
            }
        }
    }

    private fun listBlocks(ctx: Context) {
        val filter = ctx.queryAsFilter<BlockStorageListFilter>()
        ctx.json(fileStorageService.listBlocks(filter))
    }

    private fun listBlockFiles(ctx: Context) {
        val block = ctx.pathParam("block")
        val filter = ctx.queryAsFilter<BlockFileListFilter>()
        ctx.json(fileStorageService.listBlockFiles(block, filter))
    }
}
