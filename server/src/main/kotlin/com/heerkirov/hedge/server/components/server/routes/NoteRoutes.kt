package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.dto.filter.NoteFilter
import com.heerkirov.hedge.server.dto.form.NoteCreateForm
import com.heerkirov.hedge.server.dto.form.NoteUpdateForm
import com.heerkirov.hedge.server.dto.res.IdRes
import com.heerkirov.hedge.server.functions.service.HomepageService
import com.heerkirov.hedge.server.functions.service.NoteService
import com.heerkirov.hedge.server.library.form.bodyAsForm
import com.heerkirov.hedge.server.library.form.queryAsFilter
import io.javalin.Javalin
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.http.Context
import io.javalin.http.pathParamAsClass

class NoteRoutes(private val service: NoteService) : Routes {
    override fun handle(javalin: Javalin) {
        javalin.routes {
            path("api/notes") {
                get(::list)
                post(::create)
                path("{id}") {
                    get(::get)
                    patch(::update)
                    delete(::delete)
                }
            }
        }
    }

    private fun list(ctx: Context) {
        val filter = ctx.queryAsFilter<NoteFilter>()
        ctx.json(service.list(filter))
    }

    private fun create(ctx: Context) {
        val form = ctx.bodyAsForm<NoteCreateForm>()
        val id = service.create(form)
        ctx.status(201).json(IdRes(id))
    }

    private fun get(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        ctx.json(service.get(id))
    }

    private fun update(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val form = ctx.bodyAsForm<NoteUpdateForm>()
        service.update(id, form)
    }

    private fun delete(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        service.delete(id)
        ctx.status(204)
    }
}