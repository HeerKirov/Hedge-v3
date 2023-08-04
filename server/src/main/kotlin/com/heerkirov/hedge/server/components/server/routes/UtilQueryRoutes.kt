package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.dto.form.QueryForm
import com.heerkirov.hedge.server.functions.service.QueryService
import com.heerkirov.hedge.server.library.form.bodyAsForm
import io.javalin.Javalin
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.http.Context

class UtilQueryRoutes(private val queryService: QueryService) : Routes {
    override fun handle(javalin: Javalin) {
        javalin.routes {
            path("api/utils/query") {
                post("schema", ::schema)
            }
        }
    }

    private fun schema(ctx: Context) {
        val body = ctx.bodyAsForm<QueryForm>()
        ctx.json(queryService.querySchema(body.text, body.dialect))
    }
}