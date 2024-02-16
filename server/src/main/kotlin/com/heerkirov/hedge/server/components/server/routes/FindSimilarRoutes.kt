package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.dto.filter.FindSimilarTaskQueryFilter
import com.heerkirov.hedge.server.dto.filter.LimitAndOffsetFilter
import com.heerkirov.hedge.server.dto.form.FindSimilarResultResolveForm
import com.heerkirov.hedge.server.dto.form.FindSimilarTaskCreateForm
import com.heerkirov.hedge.server.dto.res.IdRes
import com.heerkirov.hedge.server.exceptions.ParamRequired
import com.heerkirov.hedge.server.exceptions.ParamTypeError
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.functions.service.FindSimilarService
import com.heerkirov.hedge.server.library.form.bodyAsForm
import com.heerkirov.hedge.server.library.form.queryAsFilter
import com.heerkirov.hedge.server.utils.Json.parseJSONObject
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.config.JavalinConfig
import io.javalin.http.Context
import io.javalin.http.bodyAsClass
import io.javalin.http.formParamAsClass
import io.javalin.http.pathParamAsClass

class FindSimilarRoutes(private val findSimilarService: FindSimilarService) : Routes {
    override fun handle(javalin: JavalinConfig) {
        javalin.router.apiBuilder {
            path("api/find-similar") {
                path("tasks") {
                    get(::getTaskList)
                    post(::createTask)
                    path("{id}") {
                        get(::getTaskDetail)
                        delete(::deleteTask)
                    }
                }
                path("results") {
                    get(::getResultList)
                    path("{id}") {
                        get(::getResultDetail)
                        post("resolve", ::resolveResult)
                        delete(::deleteResultDetail)
                    }
                }
                path("quick-find") {
                    post("new", ::createQuickFindForIllusts)
                    post("upload", ::createQuickFindForUpload)
                    get("{id}", ::getQuickFind)
                }
            }
        }
    }

    private fun getTaskList(ctx: Context) {
        val filter = ctx.queryAsFilter<FindSimilarTaskQueryFilter>()
        ctx.json(findSimilarService.listTask(filter))
    }

    private fun createTask(ctx: Context) {
        val form = ctx.bodyAsForm<FindSimilarTaskCreateForm>()
        val id = findSimilarService.createTask(form)
        ctx.status(201).json(IdRes(id))
    }

    private fun getTaskDetail(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        ctx.json(findSimilarService.getTask(id))
    }

    private fun deleteTask(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        findSimilarService.deleteTask(id)
        ctx.status(204)
    }

    private fun getResultList(ctx: Context) {
        val filter = ctx.queryAsFilter<LimitAndOffsetFilter>()
        ctx.json(findSimilarService.listResult(filter))
    }

    private fun getResultDetail(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        ctx.json(findSimilarService.getResult(id))
    }

    private fun resolveResult(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val form = ctx.bodyAsForm<FindSimilarResultResolveForm>()
        findSimilarService.resolveResult(id, form)
    }

    private fun deleteResultDetail(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        findSimilarService.deleteResult(id)
        ctx.status(204)
    }

    private fun createQuickFindForIllusts(ctx: Context) {
        val illustIds = try { ctx.bodyAsClass<List<Int>>() } catch (e: Exception) {
            throw be(ParamTypeError("illustIds", e.message ?: "cannot convert to List<Int>"))
        }
        val id = findSimilarService.createQuickFindForIllusts(illustIds)
        ctx.json(IdRes(id)).status(201)
    }

    private fun createQuickFindForUpload(ctx: Context) {
        val form = ctx.uploadedFile("file") ?: throw be(ParamRequired("file"))
        val authorStr = ctx.formParamAsClass<String>("authors").allowNullable().get()
        val topicStr = ctx.formParamAsClass<String>("topics").allowNullable().get()
        val authors = if(authorStr == null) { emptyList() } else try { authorStr.parseJSONObject<List<Int>>() }catch (e: Exception) {
            throw be(ParamTypeError("authors", e.message ?: "cannot convert to List<Int>"))
        }
        val topics = if(topicStr == null) { emptyList() } else try { topicStr.parseJSONObject<List<Int>>() }catch (e: Exception) {
            throw be(ParamTypeError("authors", e.message ?: "cannot convert to List<Int>"))
        }
        val id = findSimilarService.createQuickFindForUpload(form.content(), form.extension().trimStart('.'), authors, topics)
        ctx.json(IdRes(id)).status(201)
    }

    private fun getQuickFind(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        ctx.json(findSimilarService.getQuickFind(id))
    }
}