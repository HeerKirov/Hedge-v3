package com.heerkirov.hedge.server.components.http.routes

import com.heerkirov.hedge.server.components.http.Routes
import com.heerkirov.hedge.server.dto.form.*
import com.heerkirov.hedge.server.dto.filter.*
import com.heerkirov.hedge.server.dto.res.SourceMappingTargetItem
import com.heerkirov.hedge.server.functions.service.SourceDataService
import com.heerkirov.hedge.server.functions.service.SourceMappingService
import com.heerkirov.hedge.server.library.form.bodyAsForm
import com.heerkirov.hedge.server.library.form.bodyAsListForm
import com.heerkirov.hedge.server.library.form.queryAsFilter
import io.javalin.Javalin
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.http.Context

class SourceRoutes(private val sourceDataService: SourceDataService,
                   private val sourceMappingService: SourceMappingService) : Routes {
    override fun handle(javalin: Javalin) {
        javalin.routes {
            path("api") {
                path("source-data") {
                    get(sourceData::list)
                    post(sourceData::create)
                    post("bulk", sourceData::bulk)
                    path("{source_site}/{source_id}") {
                        get(sourceData::get)
                        patch(sourceData::update)
                        delete(sourceData::delete)
                        get("related-images", sourceData::getRelatedImages)
                    }
                }
                path("source-tag-mappings") {
                    post("batch-query", sourceTagMappings::batchQuery)
                    path("{source_site}/{source_tag_code}") {
                        get(sourceTagMappings::get)
                        put(sourceTagMappings::update)
                        delete(sourceTagMappings::delete)
                    }
                }
            }
        }
    }

    private val sourceData = object : Any() {
        fun list(ctx: Context) {
            val filter = ctx.queryAsFilter<SourceDataQueryFilter>()
            ctx.json(sourceDataService.list(filter))
        }

        fun create(ctx: Context) {
            val form = ctx.bodyAsForm<SourceDataCreateForm>()
            sourceDataService.create(form)
            ctx.status(201)
        }

        fun bulk(ctx: Context) {
            val form = ctx.bodyAsForm<SourceDataBulkForm>()
            sourceDataService.bulk(form.items)
            ctx.status(201)
        }

        fun get(ctx: Context) {
            val sourceSite = ctx.pathParamAsClass<String>("source_site").get()
            val sourceId = ctx.pathParamAsClass<Long>("source_id").get()
            ctx.json(sourceDataService.get(sourceSite, sourceId))
        }

        fun getRelatedImages(ctx: Context) {
            val sourceSite = ctx.pathParamAsClass<String>("source_site").get()
            val sourceId = ctx.pathParamAsClass<Long>("source_id").get()
            ctx.json(sourceDataService.getRelatedImages(sourceSite, sourceId))
        }

        fun update(ctx: Context) {
            val sourceSite = ctx.pathParamAsClass<String>("source_site").get()
            val sourceId = ctx.pathParamAsClass<Long>("source_id").get()
            val form = ctx.bodyAsForm<SourceDataUpdateForm>()
            sourceDataService.update(sourceSite, sourceId, form)
        }

        fun delete(ctx: Context) {
            val sourceSite = ctx.pathParamAsClass<String>("source_site").get()
            val sourceId = ctx.pathParamAsClass<Long>("source_id").get()
            sourceDataService.delete(sourceSite, sourceId)
            ctx.status(204)
        }
    }

    private val sourceTagMappings = object : Any() {
        fun batchQuery(ctx: Context) {
            val form = ctx.bodyAsForm<SourceMappingBatchQueryForm>()
            ctx.json(sourceMappingService.batchQuery(form))
        }

        fun get(ctx: Context) {
            val sourceSite = ctx.pathParamAsClass<String>("source_site").get()
            val sourceTagCode = ctx.pathParamAsClass<String>("source_tag_code").get()
            ctx.json(sourceMappingService.query(sourceSite, sourceTagCode))
        }

        fun update(ctx: Context) {
            val sourceSite = ctx.pathParamAsClass<String>("source_site").get()
            val sourceTagCode = ctx.pathParamAsClass<String>("source_tag_code").get()
            val form = ctx.bodyAsListForm<SourceMappingTargetItem>()
            sourceMappingService.update(sourceSite, sourceTagCode, form)
        }

        fun delete(ctx: Context) {
            val sourceSite = ctx.pathParamAsClass<String>("source_site").get()
            val sourceTagCode = ctx.pathParamAsClass<String>("source_tag_code").get()
            sourceMappingService.delete(sourceSite, sourceTagCode)
            ctx.status(204)
        }
    }
}