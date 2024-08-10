package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.exceptions.ParamRequired
import com.heerkirov.hedge.server.library.form.bodyAsForm
import com.heerkirov.hedge.server.library.form.queryAsFilter
import com.heerkirov.hedge.server.dto.filter.ImportFilter
import com.heerkirov.hedge.server.dto.form.*
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.functions.service.ImportService
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.config.JavalinConfig
import io.javalin.http.Context
import io.javalin.http.formParamAsClass
import io.javalin.http.pathParamAsClass
import java.time.Instant

class ImportRoutes(private val importService: ImportService) : Routes {
    override fun handle(javalin: JavalinConfig) {
        javalin.router.apiBuilder {
            path("api/imports") {
                get(::list)
                post("import", ::import)
                post("upload", ::upload)
                post("batch", ::batch)
                get("{id}", ::get)
            }
        }
    }

    private fun list(ctx: Context) {
        val filter = ctx.queryAsFilter<ImportFilter>()
        ctx.json(importService.list(filter))
    }

    private fun import(ctx: Context) {
        val form = ctx.bodyAsForm<ImportForm>()
        val id = importService.import(form)
        ctx.status(201).json(IdRes(id))
    }

    private fun upload(ctx: Context) {
        val modificationTime = ctx.formParamAsClass<String>("modificationTime").allowNullable().get()?.let { Instant.parse(it) }
        val creationTime = ctx.formParamAsClass<String>("creationTime").allowNullable().get()?.let { Instant.parse(it) }
        val form = ctx.uploadedFile("file")
            ?.let { UploadForm(it.content(), it.filename(), it.extension().trimStart('.'), modificationTime, creationTime) }
            ?: throw be(ParamRequired("file"))
        val id = importService.upload(form)
        ctx.status(201).json(IdRes(id))
    }

    private fun get(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        ctx.json(importService.get(id))
    }

    private fun batch(ctx: Context) {
        val form = ctx.bodyAsForm<ImportBatchForm>()
        importService.batch(form)
        ctx.status(200)
    }
}