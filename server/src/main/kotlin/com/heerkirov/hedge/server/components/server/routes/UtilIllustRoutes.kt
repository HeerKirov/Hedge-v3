package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.dto.form.*
import com.heerkirov.hedge.server.functions.service.IllustUtilService
import com.heerkirov.hedge.server.library.form.bodyAsForm
import io.javalin.apibuilder.ApiBuilder.path
import io.javalin.apibuilder.ApiBuilder.post
import io.javalin.config.JavalinConfig
import io.javalin.http.Context

class UtilIllustRoutes(private val illustUtilService: IllustUtilService) : Routes {
    override fun handle(javalin: JavalinConfig) {
        javalin.router.apiBuilder {
            path("api/utils/illust") {
                post("collection-situation", ::getCollectionSituation)
                post("image-situation", ::getImageSituation)
                post("book-situation", ::getBookSituation)
                post("folder-situation", ::getFolderSituation)
                post("organization-situation", ::getOrganizationSituation)
                post("organization-situation/apply", ::applyOrganizationSituation)
            }
        }
    }

    private fun getCollectionSituation(ctx: Context) {
        val form = ctx.bodyAsForm<IllustIdForm>()
        ctx.json(illustUtilService.getCollectionSituation(form.illustIds))
    }

    private fun getImageSituation(ctx: Context) {
        val form = ctx.bodyAsForm<IllustIdForm>()
        ctx.json(illustUtilService.getImageSituation(form.illustIds))
    }

    private fun getBookSituation(ctx: Context) {
        val form = ctx.bodyAsForm<BookSituationForm>()
        ctx.json(illustUtilService.getBookSituation(form.illustIds, form.bookId, form.onlyExists))
    }

    private fun getFolderSituation(ctx: Context) {
        val form = ctx.bodyAsForm<FolderSituationForm>()
        ctx.json(illustUtilService.getFolderSituation(form.illustIds, form.folderId, form.onlyExists))
    }

    private fun getOrganizationSituation(ctx: Context) {
        val form = ctx.bodyAsForm<OrganizationSituationForm>()
        ctx.json(illustUtilService.getOrganizationSituation(form))
    }

    private fun applyOrganizationSituation(ctx: Context) {
        val form = ctx.bodyAsForm<OrganizationSituationApplyForm>()
        ctx.json(illustUtilService.applyOrganizationSituation(form))
    }
}