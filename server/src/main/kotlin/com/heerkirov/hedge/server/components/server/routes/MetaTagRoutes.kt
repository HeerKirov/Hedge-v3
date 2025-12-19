package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.library.form.bodyAsForm
import com.heerkirov.hedge.server.library.form.queryAsFilter
import com.heerkirov.hedge.server.functions.service.TagService
import com.heerkirov.hedge.server.dto.filter.*
import com.heerkirov.hedge.server.dto.form.*
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.library.form.bodyAsListForm
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.config.JavalinConfig
import io.javalin.http.Context
import io.javalin.http.pathParamAsClass

class MetaTagRoutes(private val tagService: TagService) : Routes {
    override fun handle(javalin: JavalinConfig) {
        javalin.router.apiBuilder {
            path("api/tags") {
                get(::list)
                post(::create)
                get("tree", ::tree)
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
        val filter = ctx.queryAsFilter<TagFilter>()
        ctx.json(tagService.list(filter))
    }

    private fun create(ctx: Context) {
        val form = ctx.bodyAsForm<TagCreateForm>()
        val id = tagService.create(form)
        ctx.status(if(id >= 0) 201 else 202).json(IdRes(id))
    }


    private fun bulk(ctx: Context) {
        val form = ctx.bodyAsListForm<TagBulkForm>()
        ctx.json(tagService.bulk(form)).status(201)
    }

    private fun tree(ctx: Context) {
        val filter = ctx.queryAsFilter<TagTreeFilter>()
        ctx.json(tagService.tree(filter))
    }

    private fun get(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        ctx.json(tagService.get(id))
    }

    private fun update(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val form = ctx.bodyAsForm<TagUpdateForm>()
        tagService.update(id, form)
    }

    private fun delete(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        tagService.delete(id)
        ctx.status(204)
    }
}