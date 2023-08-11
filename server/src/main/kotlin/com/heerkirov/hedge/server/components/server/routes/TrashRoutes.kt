package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.dto.filter.TrashFilter
import com.heerkirov.hedge.server.exceptions.ParamTypeError
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.functions.service.TrashService
import com.heerkirov.hedge.server.library.form.queryAsFilter
import io.javalin.Javalin
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.http.Context
import io.javalin.http.pathParamAsClass
import io.javalin.http.bodyAsClass

class TrashRoutes(private val trashService: TrashService) : Routes {
    override fun handle(javalin: Javalin) {
        javalin.routes {
            path("api/trashes") {
                get(::list)
                get("{id}", ::retrieve)
                post("delete", ::delete)
                post("restore", ::restore)
            }
        }
    }

    private fun list(ctx: Context) {
        val filter = ctx.queryAsFilter<TrashFilter>()
        ctx.json(trashService.list(filter))
    }

    private fun retrieve(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        ctx.json(trashService.get(id))
    }

    private fun delete(ctx: Context) {
        val images = try { ctx.bodyAsClass<List<Int>>() } catch (e: Exception) {
            throw be(ParamTypeError("imageIds", e.message ?: "cannot convert to List<Int>"))
        }
        trashService.delete(images)
    }

    private fun restore(ctx: Context) {
        val images = try { ctx.bodyAsClass<List<Int>>() } catch (e: Exception) {
            throw be(ParamTypeError("images", e.message ?: "cannot convert to List<Int>"))
        }
        trashService.restore(images)
    }
}