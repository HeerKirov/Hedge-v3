package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.dto.filter.StagingPostFilter
import com.heerkirov.hedge.server.dto.form.StagingPostUpdateForm
import com.heerkirov.hedge.server.functions.service.StagingPostService
import com.heerkirov.hedge.server.library.form.bodyAsForm
import com.heerkirov.hedge.server.library.form.queryAsFilter
import io.javalin.Javalin
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.http.Context

class StagingPostRoutes(private val stagingPostService: StagingPostService) : Routes {
    override fun handle(javalin: Javalin) {
        javalin.routes {
            path("api/staging-post") {
                get(::list)
                patch(::update)
            }
        }
    }

    private fun list(ctx: Context) {
        val filter = ctx.queryAsFilter<StagingPostFilter>()
        ctx.json(stagingPostService.list(filter))
    }

    private fun update(ctx: Context) {
        val form = ctx.bodyAsForm<StagingPostUpdateForm>()
        stagingPostService.update(form)
    }
}