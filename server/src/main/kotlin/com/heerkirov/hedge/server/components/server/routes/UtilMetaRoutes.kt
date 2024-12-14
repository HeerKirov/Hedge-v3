package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.dto.form.MetaUtilIdentityForm
import com.heerkirov.hedge.server.dto.form.MetaUtilMetaForm
import com.heerkirov.hedge.server.dto.form.MetaUtilValidateForm
import com.heerkirov.hedge.server.enums.IdentityType
import com.heerkirov.hedge.server.functions.service.MetaEditorService
import com.heerkirov.hedge.server.library.form.bodyAsForm
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.config.JavalinConfig
import io.javalin.http.Context
import io.javalin.http.pathParamAsClass

class UtilMetaRoutes(private val metaEditorService: MetaEditorService) : Routes {
    override fun handle(javalin: JavalinConfig) {
        javalin.router.apiBuilder {
            path("api/utils/meta-editor") {
                post("validate", ::validate)
                post("suggest", ::suggest)
                path("history") {
                    path("identities") {
                        get(::getHistoryIdentityList)
                        get("{type}/{id}", ::getHistoryIdentityDetail)
                        post(::pushHistoryIdentity)
                    }
                    path("meta-tags") {
                        get(::getHistoryMetaRecent)
                        post(::pushHistoryMeta)
                        delete(::deleteAllHistoryMeta)
                    }
                }
            }
        }
    }

    private fun validate(ctx: Context) {
        val form = ctx.bodyAsForm<MetaUtilValidateForm>()
        ctx.json(metaEditorService.validate(form))
    }

    private fun suggest(ctx: Context) {
        val form = ctx.bodyAsForm<MetaUtilIdentityForm>()
        ctx.json(metaEditorService.suggest(form))
    }

    private fun getHistoryIdentityList(ctx: Context) {
        ctx.json(metaEditorService.getHistoryIdentityList())
    }

    private fun getHistoryIdentityDetail(ctx: Context) {
        val type = IdentityType.valueOf(ctx.pathParam("type").uppercase())
        val id = ctx.pathParamAsClass<Int>("id").get()
        ctx.json(metaEditorService.getHistoryIdentityDetail(type, id))
    }

    private fun pushHistoryIdentity(ctx: Context) {
        val form = ctx.bodyAsForm<MetaUtilIdentityForm>()
        metaEditorService.pushHistoryIdentity(form)
    }

    private fun getHistoryMetaRecent(ctx: Context) {
        ctx.json(metaEditorService.getHistoryMetaRecent())
    }

    private fun pushHistoryMeta(ctx: Context) {
        val form = ctx.bodyAsForm<MetaUtilMetaForm>()
        metaEditorService.pushHistoryMeta(form)
    }

    private fun deleteAllHistoryMeta(ctx: Context) {
        metaEditorService.deleteAllHistoryMeta()
        ctx.status(204)
    }
}