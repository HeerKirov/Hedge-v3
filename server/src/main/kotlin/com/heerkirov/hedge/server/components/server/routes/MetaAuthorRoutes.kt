package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.library.form.bodyAsForm
import com.heerkirov.hedge.server.library.form.queryAsFilter
import com.heerkirov.hedge.server.dto.filter.AuthorFilter
import com.heerkirov.hedge.server.dto.form.AuthorBulkForm
import com.heerkirov.hedge.server.dto.form.AuthorCreateForm
import com.heerkirov.hedge.server.dto.form.AuthorUpdateForm
import com.heerkirov.hedge.server.dto.res.IdRes
import com.heerkirov.hedge.server.functions.service.AuthorService
import com.heerkirov.hedge.server.library.form.bodyAsListForm
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.config.JavalinConfig
import io.javalin.http.Context
import io.javalin.http.pathParamAsClass

class MetaAuthorRoutes(private val authorService: AuthorService) : Routes {
    override fun handle(javalin: JavalinConfig) {
        javalin.router.apiBuilder {
            path("api/authors") {
                get(::list)
                post(::create)
                post("bulk", ::bulk)
                path("{id}") {
                    get(::get)
                    patch(::update)
                    delete(::delete)
                }
            }
        }
    }

    private fun list(ctx: Context) {
        val filter = ctx.queryAsFilter<AuthorFilter>()
        ctx.json(authorService.list(filter))
    }

    private fun create(ctx: Context) {
        val form = ctx.bodyAsForm<AuthorCreateForm>()
        val id = authorService.create(form)
        ctx.status(if(id >= 0) 201 else 202).json(IdRes(id))
    }

    private fun bulk(ctx: Context) {
        val form = ctx.bodyAsListForm<AuthorBulkForm>()
        ctx.json(authorService.bulk(form)).status(201)
    }

    private fun get(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        ctx.json(authorService.get(id))
    }

    private fun update(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val form = ctx.bodyAsForm<AuthorUpdateForm>()
        authorService.update(id, form)
    }

    private fun delete(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        authorService.delete(id)
        ctx.status(204)
    }
}