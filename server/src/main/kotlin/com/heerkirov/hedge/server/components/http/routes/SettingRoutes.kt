package com.heerkirov.hedge.server.components.http.routes

import com.heerkirov.hedge.server.components.http.Routes
import com.heerkirov.hedge.server.functions.service.*
import com.heerkirov.hedge.server.library.form.bodyAsForm
import com.heerkirov.hedge.server.dto.form.*
import io.javalin.Javalin
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.http.Context

class SettingRoutes(private val setting: SettingService) : Routes {
    override fun handle(javalin: Javalin) {
        javalin.routes {
            path("api/setting") {
                path("service") {
                    get(::getAppdataService)
                    patch(::updateAppdataService)
                }
                path("meta") {
                    get(::getMeta)
                    patch(::updateMeta)
                }
                path("query") {
                    get(::getQuery)
                    patch(::updateQuery)
                }
                path("import") {
                    get(::getImport)
                    patch(::updateImport)
                }
                path("find-similar") {
                    get(::getFindSimilar)
                    patch(::updateFindSimilar)
                }
                path("file") {
                    get(::getFile)
                    patch(::updateFile)
                }
                path("source") {
                    path("sites") {
                        get(::listSourceSite)
                        post(::createSourceSite)
                        path("{name}") {
                            get(::getSourceSite)
                            put(::updateSourceSite)
                            delete(::deleteSourceSite)
                        }
                    }
                }
            }
        }
    }

    private fun getAppdataService(ctx: Context) {
        ctx.json(setting.getAppdataService())
    }

    private fun updateAppdataService(ctx: Context) {
        val form = ctx.bodyAsForm<ServiceOptionUpdateForm>()
        setting.updateAppdataService(form)
    }

    private fun getMeta(ctx: Context) {
        ctx.json(setting.getMeta())
    }

    private fun updateMeta(ctx: Context) {
        val form = ctx.bodyAsForm<MetaOptionUpdateForm>()
        setting.updateMeta(form)
    }

    private fun getQuery(ctx: Context) {
        ctx.json(setting.getQuery())
    }

    private fun updateQuery(ctx: Context) {
        val form = ctx.bodyAsForm<QueryOptionUpdateForm>()
        setting.updateQuery(form)
    }

    private fun getImport(ctx: Context) {
        ctx.json(setting.getImport())
    }

    private fun updateImport(ctx: Context) {
        val form = ctx.bodyAsForm<ImportOptionUpdateForm>()
        setting.updateImport(form)
    }

    private fun getFindSimilar(ctx: Context) {
        ctx.json(setting.getFindSimilar())
    }

    private fun updateFindSimilar(ctx: Context) {
        val form = ctx.bodyAsForm<FindSimilarOptionUpdateForm>()
        setting.updateFindSimilar(form)
    }

    private fun getFile(ctx: Context) {
        ctx.json(setting.getFile())
    }

    private fun updateFile(ctx: Context) {
        val form = ctx.bodyAsForm<FileOptionUpdateForm>()
        setting.updateFile(form)
    }

    private fun listSourceSite(ctx: Context) {
        ctx.json(setting.listSourceSite())
    }

    private fun createSourceSite(ctx: Context) {
        val form = ctx.bodyAsForm<SiteCreateForm>()
        setting.createSourceSite(form)
        ctx.status(201)
    }

    private fun getSourceSite(ctx: Context) {
        val name = ctx.pathParam("name")
        ctx.json(setting.getSourceSite(name))
    }

    private fun updateSourceSite(ctx: Context) {
        val name = ctx.pathParam("name")
        val form = ctx.bodyAsForm<SiteUpdateForm>()
        setting.updateSourceSite(name, form)
    }

    private fun deleteSourceSite(ctx: Context) {
        val name = ctx.pathParam("name")
        setting.deleteSourceSite(name)
        ctx.status(204)
    }
}