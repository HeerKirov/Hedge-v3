package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.dto.filter.MetaKeywordsFilter
import com.heerkirov.hedge.server.dto.form.HistoryPushForm
import com.heerkirov.hedge.server.functions.service.PickerUtilService
import com.heerkirov.hedge.server.library.form.bodyAsForm
import com.heerkirov.hedge.server.library.form.queryAsFilter
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.config.JavalinConfig
import io.javalin.http.Context

class UtilPickerRoutes(private val pickerUtilService: PickerUtilService) : Routes {
    override fun handle(javalin: JavalinConfig) {
        javalin.router.apiBuilder {
            path("api/utils/picker/history") {
                get("folders", ::getRecentFolders)
                get("topics", ::getRecentTopics)
                get("authors", ::getRecentAuthors)
                get("meta-keywords", ::getMetaKeywords)
                post(::push)
            }
        }
    }

    private fun getRecentFolders(ctx: Context) {
        ctx.json(pickerUtilService.getRecentFolders())
    }

    private fun getRecentTopics(ctx: Context) {
        ctx.json(pickerUtilService.getRecentTopics())
    }

    private fun getRecentAuthors(ctx: Context) {
        ctx.json(pickerUtilService.getRecentAuthors())
    }

    private fun getMetaKeywords(ctx: Context) {
        val filter = ctx.queryAsFilter<MetaKeywordsFilter>()
        ctx.json(pickerUtilService.getMetaKeywords(filter))
    }

    private fun push(ctx: Context) {
        val form = ctx.bodyAsForm<HistoryPushForm>()
        pickerUtilService.pushUsedHistory(form)
    }
}