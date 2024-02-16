package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.exceptions.ParamTypeError
import com.heerkirov.hedge.server.dto.filter.FolderImagesFilter
import com.heerkirov.hedge.server.dto.filter.FolderQueryFilter
import com.heerkirov.hedge.server.dto.filter.FolderTreeFilter
import com.heerkirov.hedge.server.dto.form.FolderCreateForm
import com.heerkirov.hedge.server.dto.form.FolderImagesPartialUpdateForm
import com.heerkirov.hedge.server.dto.form.FolderPinForm
import com.heerkirov.hedge.server.dto.form.FolderUpdateForm
import com.heerkirov.hedge.server.dto.res.IdRes
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.functions.service.FolderService
import com.heerkirov.hedge.server.library.form.bodyAsForm
import com.heerkirov.hedge.server.library.form.queryAsFilter
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.config.JavalinConfig
import io.javalin.http.Context
import io.javalin.http.bodyAsClass
import io.javalin.http.pathParamAsClass

class FolderRoutes(private val folderService: FolderService) : Routes {
    override fun handle(javalin: JavalinConfig) {
        javalin.router.apiBuilder {
            path("api/folders") {
                get(::list)
                post(::create)
                get("tree", ::tree)
                path("pin") {
                    get(::pinList)
                    path("{id}") {
                        put(::pinUpdate)
                        delete(::pinDelete)
                    }
                }
                path("{id}") {
                    get(::get)
                    patch(::update)
                    delete(::delete)
                    path("images") {
                        get(::listImages)
                        put(::updateImages)
                        patch(::partialUpdateImages)
                    }
                }
            }
        }
    }

    private fun list(ctx: Context) {
        val filter = ctx.queryAsFilter<FolderQueryFilter>()
        ctx.json(folderService.list(filter))
    }

    private fun tree(ctx: Context) {
        val filter = ctx.queryAsFilter<FolderTreeFilter>()
        ctx.json(folderService.tree(filter))
    }

    private fun create(ctx: Context) {
        val form = ctx.bodyAsForm<FolderCreateForm>()
        val id = folderService.create(form)
        ctx.status(201).json(IdRes(id))
    }

    private fun get(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        ctx.json(folderService.get(id))
    }

    private fun update(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val form = ctx.bodyAsForm<FolderUpdateForm>()
        folderService.update(id, form)
    }

    private fun delete(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        folderService.delete(id)
        ctx.status(204)
    }

    private fun listImages(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val filter = ctx.queryAsFilter<FolderImagesFilter>()
        ctx.json(folderService.getImages(id, filter))
    }

    private fun updateImages(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val images = try { ctx.bodyAsClass<List<Int>>() } catch (e: Exception) {
            throw be(ParamTypeError("images", e.message ?: "cannot convert to List<Int>"))
        }
        folderService.updateImages(id, images)
    }

    private fun partialUpdateImages(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val form = ctx.bodyAsForm<FolderImagesPartialUpdateForm>()
        folderService.partialUpdateImages(id, form)
    }

    private fun pinList(ctx: Context) {
        ctx.json(folderService.getPinFolders())
    }

    private fun pinUpdate(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val form = ctx.bodyAsForm<FolderPinForm>()
        folderService.updatePinFolder(id, form)
    }

    private fun pinDelete(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        folderService.deletePinFolder(id)
    }
}