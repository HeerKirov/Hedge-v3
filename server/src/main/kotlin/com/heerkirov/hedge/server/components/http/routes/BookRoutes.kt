package com.heerkirov.hedge.server.components.http.routes

import com.heerkirov.hedge.server.components.http.Routes
import com.heerkirov.hedge.server.exceptions.ParamTypeError
import com.heerkirov.hedge.server.dto.*
import com.heerkirov.hedge.server.dto.filter.BookQueryFilter
import com.heerkirov.hedge.server.dto.filter.LimitAndOffsetFilter
import com.heerkirov.hedge.server.dto.form.BookCreateForm
import com.heerkirov.hedge.server.dto.form.BookImagesPartialUpdateForm
import com.heerkirov.hedge.server.dto.form.BookUpdateForm
import com.heerkirov.hedge.server.dto.res.IdRes
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.functions.service.BookService
import com.heerkirov.hedge.server.library.form.bodyAsForm
import com.heerkirov.hedge.server.library.form.queryAsFilter
import io.javalin.Javalin
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.http.Context

class BookRoutes(private val bookService: BookService) : Routes {
    override fun handle(javalin: Javalin) {
        javalin.routes {
            path("api/books") {
                get(::list)
                post(::create)
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
        val filter = ctx.queryAsFilter<BookQueryFilter>()
        ctx.json(bookService.list(filter))
    }

    private fun create(ctx: Context) {
        val form = ctx.bodyAsForm<BookCreateForm>()
        val id = bookService.create(form)
        ctx.status(201).json(IdRes(id))
    }

    private fun get(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        ctx.json(bookService.get(id))
    }

    private fun update(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val form = ctx.bodyAsForm<BookUpdateForm>()
        bookService.update(id, form)
    }

    private fun delete(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        bookService.delete(id)
        ctx.status(204)
    }

    private fun listImages(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val filter = ctx.queryAsFilter<LimitAndOffsetFilter>()
        ctx.json(bookService.getImages(id, filter))
    }

    private fun updateImages(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val images = try { ctx.bodyAsClass<List<Int>>() } catch (e: Exception) {
            throw be(ParamTypeError("images", e.message ?: "cannot convert to List<Int>"))
        }
        bookService.updateImages(id, images)
    }

    private fun partialUpdateImages(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val form = ctx.bodyAsForm<BookImagesPartialUpdateForm>()
        bookService.partialUpdateImages(id, form)
    }
}