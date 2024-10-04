package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.functions.service.*
import com.heerkirov.hedge.server.library.form.bodyAsForm
import com.heerkirov.hedge.server.dto.form.*
import com.heerkirov.hedge.server.library.form.bodyAsListForm
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.config.JavalinConfig
import io.javalin.http.Context

class SettingRoutes(private val setting: SettingService) : Routes {
    override fun handle(javalin: JavalinConfig) {
        javalin.router.apiBuilder {
            path("api/setting") {
                path("server") {
                    get(::getServer)
                    patch(::updateServer)
                }
                path("storage") {
                    get(::getStorage)
                    patch(::updateStorage)
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
                path("source/sites") {
                    get(::listSourceSite)
                    get("builtins", ::listBuiltinSourceSite)
                    put(::updateAllSourceSite)
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

    private fun getServer(ctx: Context) {
        ctx.json(setting.getServer())
    }

    private fun updateServer(ctx: Context) {
        val form = ctx.bodyAsForm<ServerOptionUpdateForm>()
        setting.updateServer(form)
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

    private fun getStorage(ctx: Context) {
        ctx.json(setting.getStorage())
    }

    private fun updateStorage(ctx: Context) {
        val form = ctx.bodyAsForm<StorageOptionUpdateForm>()
        setting.updateStorage(form)
    }

    private fun listSourceSite(ctx: Context) {
        ctx.json(setting.listSourceSite())
    }

    private fun listBuiltinSourceSite(ctx: Context) {
        ctx.json(setting.listBuiltinSourceSite())
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

    private fun updateAllSourceSite(ctx: Context) {
        val form = ctx.bodyAsListForm<SiteBulkForm>()
        setting.updateAllSourceSite(form)
    }
}