package com.heerkirov.hedge.server.components.http.routes

import com.heerkirov.hedge.server.components.http.Routes
import com.heerkirov.hedge.server.library.form.bodyAsForm
import com.heerkirov.hedge.server.library.form.queryAsFilter
import com.heerkirov.hedge.server.functions.service.TagService
import com.heerkirov.hedge.server.dto.filter.*
import com.heerkirov.hedge.server.dto.form.*
import com.heerkirov.hedge.server.dto.res.*
import io.javalin.Javalin
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.http.Context

class TagRoutes(private val tagService: TagService) : Routes {
    override fun handle(javalin: Javalin) {
        javalin.routes {
            path("api/tags") {
                get(::list)
                post(::create)
                get("tree", ::tree)
                path("{id}") {
                    get(::get)
                    patch(::update)
                    delete(::delete)
                    post("duplicate", ::duplicate)
                    post("merge", ::merge)
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
        ctx.status(201).json(IdRes(id))
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

    private fun duplicate(ctx: Context) {

    }

    private fun merge(ctx: Context) {

    }
}