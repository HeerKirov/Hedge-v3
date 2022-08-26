package com.heerkirov.hedge.server.components.http.routes

import com.heerkirov.hedge.server.components.http.Routes
import com.heerkirov.hedge.server.functions.service.*
import com.heerkirov.hedge.server.library.form.bodyAsForm
import com.heerkirov.hedge.server.dto.form.*
import io.javalin.Javalin
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.http.Context

class SettingRoutes(settingMetaService: SettingMetaService,
                    settingQueryService: SettingQueryService,
                    settingImportService: SettingImportService,
                    settingSourceService: SettingSourceService,
                    settingFindSimilarService: SettingFindSimilarService,
                    settingAppdataService: SettingAppdataService) : Routes {
    override fun handle(javalin: Javalin) {
        javalin.routes {
            path("api/setting") {
                path("service") {
                    get(service::get)
                    patch(service::update)
                }
                path("meta") {
                    get(meta::get)
                    patch(meta::update)
                }
                path("query") {
                    get(query::get)
                    patch(query::update)
                }
                path("import") {
                    get(import::get)
                    patch(import::update)
                }
                path("find-similar") {
                    get(findSimilar::get)
                    patch(findSimilar::update)
                }
                path("source") {
                    path("sites") {
                        get(site::list)
                        post(site::create)
                        path("{name}") {
                            get(site::get)
                            put(site::update)
                            delete(site::delete)
                        }
                    }
                }
            }
        }
    }

    private val meta = Meta(settingMetaService)
    private val query = Query(settingQueryService)
    private val import = Import(settingImportService)
    private val findSimilar = FindSimilar(settingFindSimilarService)
    private val site = Site(settingSourceService)
    private val service = Service(settingAppdataService)

    private class Service(private val service: SettingAppdataService) {
        fun get(ctx: Context) {
            ctx.json(service.getService())
        }

        fun update(ctx: Context) {
            val form = ctx.bodyAsForm<ServiceOptionUpdateForm>()
            service.updateService(form)
        }
    }

    private class Meta(private val service: SettingMetaService) {
        fun get(ctx: Context) {
            ctx.json(service.get())
        }

        fun update(ctx: Context) {
            val form = ctx.bodyAsForm<MetaOptionUpdateForm>()
            service.update(form)
        }
    }

    private class Query(private val service: SettingQueryService) {
        fun get(ctx: Context) {
            ctx.json(service.get())
        }

        fun update(ctx: Context) {
            val form = ctx.bodyAsForm<QueryOptionUpdateForm>()
            service.update(form)
        }
    }

    private class Import(private val service: SettingImportService) {
        fun get(ctx: Context) {
            ctx.json(service.get())
        }

        fun update(ctx: Context) {
            val form = ctx.bodyAsForm<ImportOptionUpdateForm>()
            service.update(form)
        }
    }

    private class FindSimilar(private val service: SettingFindSimilarService) {
        fun get(ctx: Context) {
            ctx.json(service.get())
        }

        fun update(ctx: Context) {
            val form = ctx.bodyAsForm<FindSimilarOptionUpdateForm>()
            service.update(form)
        }
    }

    private class Site(private val service: SettingSourceService) {
        fun list(ctx: Context) {
            ctx.json(service.list())
        }

        fun create(ctx: Context) {
            val form = ctx.bodyAsForm<SiteCreateForm>()
            service.create(form)
            ctx.status(201)
        }

        fun get(ctx: Context) {
            val name = ctx.pathParam("name")
            ctx.json(service.get(name))
        }

        fun update(ctx: Context) {
            val name = ctx.pathParam("name")
            val form = ctx.bodyAsForm<SiteUpdateForm>()
            service.update(name, form)
        }

        fun delete(ctx: Context) {
            val name = ctx.pathParam("name")
            service.delete(name)
            ctx.status(204)
        }
    }
}