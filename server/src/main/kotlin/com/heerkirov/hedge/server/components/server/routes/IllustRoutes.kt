package com.heerkirov.hedge.server.components.server.routes

import com.heerkirov.hedge.server.components.server.Routes
import com.heerkirov.hedge.server.dto.filter.*
import com.heerkirov.hedge.server.exceptions.ParamTypeError
import com.heerkirov.hedge.server.dto.form.*
import com.heerkirov.hedge.server.dto.res.IdRes
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.functions.service.IllustService
import com.heerkirov.hedge.server.library.form.bodyAsForm
import com.heerkirov.hedge.server.library.form.queryAsFilter
import io.javalin.apibuilder.ApiBuilder.*
import io.javalin.config.JavalinConfig
import io.javalin.http.Context
import io.javalin.http.pathParamAsClass
import io.javalin.http.bodyAsClass

class IllustRoutes(private val illustService: IllustService) : Routes {
    override fun handle(javalin: JavalinConfig) {
        javalin.router.apiBuilder {
            path("api") {
                path("illusts") {
                    get(::list)
                    get("partitions", ::listPartitions)
                    get("find-location", ::findImageLocation)
                    post("find-by-ids", ::findByIds)
                    post("summary-by-ids", ::summaryByIds)
                    post("batch-update", ::batchUpdate)
                    post("clone-image-props", ::cloneImageProps)
                    path("{id}") {
                        get(::get)
                        get("simple", ::getSimple)
                        patch(::update)
                        delete(::delete)
                    }
                    path("collection") {
                        post(::createCollection)
                        path("{id}") {
                            get(::getCollection)
                            patch(::updateCollection)
                            delete(::deleteCollection)
                            path("related-items") {
                                get(::getCollectionRelatedItems)
                                patch(::updateCollectionRelatedItems)
                            }
                            path("images") {
                                get(::listCollectionImages)
                                put(::updateCollectionImages)
                                patch(::partialUpdateCollectionImages)
                            }
                        }
                    }
                    path("image") {
                        path("{id}") {
                            get(::getImage)
                            patch(::updateImage)
                            delete(::deleteImage)
                            path("source-data") {
                                get(::getImageSourceData)
                                patch(::updateImageSourceData)
                            }
                            path("related-items") {
                                get(::getImageRelatedItems)
                                patch(::updateImageRelatedItems)
                            }
                        }
                    }
                    path("associate") {
                        path("{id}") {
                            get(::getAssociate)
                            put(::setAssociate)
                        }
                    }
                }
            }
        }
    }

    private fun list(ctx: Context) {
        val filter = ctx.queryAsFilter<IllustQueryFilter>()
        ctx.json(illustService.list(filter))
    }

    private fun listPartitions(ctx: Context) {
        val filter = ctx.queryAsFilter<PartitionFilter>()
        ctx.json(illustService.listPartitions(filter))
    }

    private fun findByIds(ctx: Context) {
        val images = try { ctx.bodyAsClass<List<Int>>() } catch (e: Exception) {
            throw be(ParamTypeError("images", e.message ?: "cannot convert to List<Int>"))
        }
        ctx.json(illustService.findByIds(images))
    }

    private fun summaryByIds(ctx: Context) {
        val form = ctx.bodyAsForm<IllustSummaryForm>()
        ctx.json(illustService.summaryByIds(form))
    }

    private fun findImageLocation(ctx: Context) {
        val filter = ctx.queryAsFilter<IllustLocationFilter>()
        ctx.json(illustService.findImageLocation(filter))
    }

    private fun get(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        ctx.json(illustService.get(id))
    }

    private fun getSimple(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        ctx.json(illustService.getSimple(id))
    }

    private fun update(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val form = ctx.bodyAsForm<IllustUpdateForm>()
        illustService.update(id, form)
    }

    private fun delete(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val options = ctx.queryAsFilter<IllustDeleteOptions>()
        illustService.delete(id, options)
        ctx.status(204)
    }

    private fun createCollection(ctx: Context) {
        val form = ctx.bodyAsForm<IllustCollectionCreateForm>()
        val id = illustService.createCollection(form)
        ctx.status(201).json(IdRes(id))
    }

    private fun getCollection(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        ctx.json(illustService.get(id, IllustType.COLLECTION))
    }

    private fun updateCollection(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val form = ctx.bodyAsForm<IllustUpdateForm>()
        illustService.updateCollection(id, form)
    }

    private fun deleteCollection(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val options = ctx.queryAsFilter<IllustDeleteOptions>()
        illustService.delete(id, options, IllustType.COLLECTION)
        ctx.status(204)
    }

    private fun getCollectionRelatedItems(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        ctx.json(illustService.getCollectionRelatedItems(id))
    }

    private fun updateCollectionRelatedItems(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val form = ctx.bodyAsForm<IllustCollectionRelatedUpdateForm>()
        illustService.updateCollectionRelatedItems(id, form)
    }

    private fun listCollectionImages(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val filter = ctx.queryAsFilter<LimitAndOffsetFilter>()
        ctx.json(illustService.getCollectionImages(id, filter))
    }

    private fun updateCollectionImages(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val form = ctx.bodyAsForm<IllustCollectionImagesUpdateForm>()
        illustService.updateCollectionImages(id, form)
    }

    private fun partialUpdateCollectionImages(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val form = ctx.bodyAsForm<IllustCollectionImagesPartialUpdateForm>()
        illustService.partialUpdateCollectionImages(id, form)
    }

    private fun getImage(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        ctx.json(illustService.get(id, IllustType.IMAGE))
    }

    private fun updateImage(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val form = ctx.bodyAsForm<IllustUpdateForm>()
        illustService.updateImage(id, form)
    }

    private fun deleteImage(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val options = ctx.queryAsFilter<IllustDeleteOptions>()
        illustService.delete(id, options, IllustType.IMAGE)
        ctx.status(204)
    }

    private fun getImageSourceData(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        ctx.json(illustService.getImageSourceData(id))
    }

    private fun updateImageSourceData(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val form = ctx.bodyAsForm<IllustImageSourceDataUpdateForm>()
        illustService.updateImageSourceData(id, form)
    }

    private fun getImageRelatedItems(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        ctx.json(illustService.getImageRelatedItems(id))
    }

    private fun updateImageRelatedItems(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val form = ctx.bodyAsForm<IllustImageRelatedUpdateForm>()
        illustService.updateImageRelatedItems(id, form)
    }

    private fun getAssociate(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        ctx.json(illustService.getAssociate(id))
    }

    private fun setAssociate(ctx: Context) {
        val id = ctx.pathParamAsClass<Int>("id").get()
        val images = try { ctx.bodyAsClass<List<Int>>() } catch (e: Exception) {
            throw be(ParamTypeError("illusts", e.message ?: "cannot convert to List<Int>"))
        }
        ctx.json(illustService.setAssociate(id, images))
    }

    private fun batchUpdate(ctx: Context) {
        val form = ctx.bodyAsForm<IllustBatchUpdateForm>()
        illustService.batchUpdate(form)
    }

    private fun cloneImageProps(ctx: Context) {
        val form = ctx.bodyAsForm<ImagePropsCloneForm>()
        illustService.cloneImageProps(form)
    }
}