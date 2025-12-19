package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.dto.filter.TopicFilter
import com.heerkirov.hedge.server.dto.form.TopicBulkForm
import com.heerkirov.hedge.server.dto.form.TopicCreateForm
import com.heerkirov.hedge.server.dto.form.TopicUpdateForm
import com.heerkirov.hedge.server.dto.res.IdRes
import com.heerkirov.hedge.server.library.form.bodyAsForm
import com.heerkirov.hedge.server.library.form.queryAsFilter
import com.heerkirov.hedge.server.functions.service.TopicService
import com.heerkirov.hedge.server.library.form.bodyAsListForm
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.config.JavalinConfig
import io.javalin.http.Context
import io.javalin.http.pathParamAsClass

class MetaTopicRoutes(private val topicService: TopicService) : Routes {
    override fun handle(javalin: JavalinConfig) {
        javalin.router.apiBuilder {
            path("api/topics") {
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
        val filter = ctx.queryAsFilter<TopicFilter>()
        ctx.json(topicService.list(filter))
    }

    private fun create(ctx: Context) {
        val form = ctx.bodyAsForm<TopicCreateForm>()
        val id = topicService.create(form)
        ctx.status(if(id >= 0) 201 else 202).json(IdRes(id))
    }

    private fun bulk(ctx: Context) {
        val form = ctx.bodyAsListForm<TopicBulkForm>()
        ctx.json(topicService.bulk(form)).status(201)
    }

    private fun get(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        ctx.json(topicService.get(id))
    }

    private fun update(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val form = ctx.bodyAsForm<TopicUpdateForm>()
        topicService.update(id, form)
    }

    private fun delete(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        topicService.delete(id)
        ctx.status(204)
    }
}