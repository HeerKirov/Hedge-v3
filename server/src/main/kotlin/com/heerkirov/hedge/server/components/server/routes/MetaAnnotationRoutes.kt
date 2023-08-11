package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.dto.filter.AnnotationFilter
import com.heerkirov.hedge.server.dto.form.AnnotationCreateForm
import com.heerkirov.hedge.server.dto.form.AnnotationUpdateForm
import com.heerkirov.hedge.server.library.form.bodyAsForm
import com.heerkirov.hedge.server.library.form.queryAsFilter
import com.heerkirov.hedge.server.dto.res.IdRes
import com.heerkirov.hedge.server.functions.service.AnnotationService
import io.javalin.Javalin
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.http.Context
import io.javalin.http.pathParamAsClass

class MetaAnnotationRoutes(private val annotationService: AnnotationService) : Routes {
    override fun handle(javalin: Javalin) {
        javalin.routes {
            path("api/annotations") {
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
        val filter = ctx.queryAsFilter<AnnotationFilter>()
        ctx.json(annotationService.list(filter))
    }

    private fun create(ctx: Context) {
        val form = ctx.bodyAsForm<AnnotationCreateForm>()
        val id = annotationService.create(form)
        ctx.status(201).json(IdRes(id))
    }

    private fun get(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        ctx.json(annotationService.get(id))
    }

    private fun update(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val form = ctx.bodyAsForm<AnnotationUpdateForm>()
        annotationService.update(id, form)
    }

    private fun delete(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        annotationService.delete(id)
        ctx.status(204)
    }
}