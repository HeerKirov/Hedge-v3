package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.dto.form.*
import com.heerkirov.hedge.server.dto.filter.*
import com.heerkirov.hedge.server.dto.res.SourceDataPath
import com.heerkirov.hedge.server.dto.res.SourceMappingTargetItem
import com.heerkirov.hedge.server.dto.res.SourceTagPath
import com.heerkirov.hedge.server.exceptions.ParamTypeError
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.functions.service.SourceDataService
import com.heerkirov.hedge.server.functions.service.SourceMappingService
import com.heerkirov.hedge.server.library.form.bodyAsForm
import com.heerkirov.hedge.server.library.form.bodyAsListForm
import com.heerkirov.hedge.server.library.form.queryAsFilter
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.config.JavalinConfig
import io.javalin.http.Context
import io.javalin.http.bodyAsClass
import io.javalin.http.pathParamAsClass

class SourceRoutes(private val sourceDataService: SourceDataService,
                   private val sourceMappingService: SourceMappingService) : Routes {
    override fun handle(javalin: JavalinConfig) {
        javalin.router.apiBuilder {
            path("api") {
                path("source-data") {
                    get(sourceData::list)
                    post(sourceData::create)
                    post("bulk", sourceData::bulk)
                    post("collect-status", sourceData::collectStatus)
                    post("analyse-name", sourceData::analyseSourceName)
                    path("{source_site}/{source_id}") {
                        get(sourceData::get)
                        patch(sourceData::update)
                        delete(sourceData::delete)
                        get("related-images", sourceData::getRelatedImages)
                    }
                }
                path("source-tag-mappings") {
                    post("batch-query", sourceTagMappings::batchQuery)
                    post("batch-query-by-illusts", sourceTagMappings::batchQueryByIllusts)
                    path("{source_site}/{source_tag_type}/{source_tag_code}") {
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
            val form = ctx.bodyAsListForm<SourceDataCreateForm>()
            ctx.json(sourceDataService.bulk(form)).status(201)
        }

        fun get(ctx: Context) {
            val sourceSite = ctx.pathParamAsClass<String>("source_site").get()
            val sourceId = ctx.pathParamAsClass<String>("source_id").get()
            ctx.json(sourceDataService.get(sourceSite, sourceId))
        }

        fun getRelatedImages(ctx: Context) {
            val sourceSite = ctx.pathParamAsClass<String>("source_site").get()
            val sourceId = ctx.pathParamAsClass<String>("source_id").get()
            ctx.json(sourceDataService.getRelatedImages(sourceSite, sourceId))
        }

        fun update(ctx: Context) {
            val sourceSite = ctx.pathParamAsClass<String>("source_site").get()
            val sourceId = ctx.pathParamAsClass<String>("source_id").get()
            val form = ctx.bodyAsForm<SourceDataUpdateForm>()
            sourceDataService.update(sourceSite, sourceId, form)
        }

        fun delete(ctx: Context) {
            val sourceSite = ctx.pathParamAsClass<String>("source_site").get()
            val sourceId = ctx.pathParamAsClass<String>("source_id").get()
            sourceDataService.delete(sourceSite, sourceId)
            ctx.status(204)
        }

        fun collectStatus(ctx: Context) {
            val paths = ctx.bodyAsListForm<SourceDataPath>()
            ctx.json(sourceDataService.getCollectStatus(paths))
        }

        fun analyseSourceName(ctx: Context) {
            val filenames = try { ctx.bodyAsClass<List<String>>() } catch (e: Exception) {
                throw be(ParamTypeError("filenames", e.message ?: "cannot convert to List<String>"))
            }
            ctx.json(sourceDataService.analyseSourceName(filenames))
        }
    }

    private val sourceTagMappings = object : Any() {
        fun batchQuery(ctx: Context) {
            val form = ctx.bodyAsListForm<SourceTagPath>()
            ctx.json(sourceMappingService.batchQuery(form))
        }

        fun batchQueryByIllusts(ctx: Context) {
            val illustIds = try { ctx.bodyAsClass<List<Int>>() } catch (e: Exception) {
                throw be(ParamTypeError("illustIds", e.message ?: "cannot convert to List<Int>"))
            }
            ctx.json(sourceMappingService.batchQueryByIllusts(illustIds))
        }

        fun get(ctx: Context) {
            val sourceSite = ctx.pathParamAsClass<String>("source_site").get()
            val sourceTagType = ctx.pathParamAsClass<String>("source_tag_type").get()
            val sourceTagCode = ctx.pathParamAsClass<String>("source_tag_code").get()
            ctx.json(sourceMappingService.query(sourceSite, sourceTagType, sourceTagCode))
        }

        fun update(ctx: Context) {
            val sourceSite = ctx.pathParamAsClass<String>("source_site").get()
            val sourceTagType = ctx.pathParamAsClass<String>("source_tag_type").get()
            val sourceTagCode = ctx.pathParamAsClass<String>("source_tag_code").get()
            val form = ctx.bodyAsListForm<SourceMappingTargetItem>()
            sourceMappingService.update(sourceSite, sourceTagType, sourceTagCode, form)
        }

        fun delete(ctx: Context) {
            val sourceSite = ctx.pathParamAsClass<String>("source_site").get()
            val sourceTagType = ctx.pathParamAsClass<String>("source_tag_type").get()
            val sourceTagCode = ctx.pathParamAsClass<String>("source_tag_code").get()
            sourceMappingService.delete(sourceSite, sourceTagType, sourceTagCode)
            ctx.status(204)
        }
    }
}