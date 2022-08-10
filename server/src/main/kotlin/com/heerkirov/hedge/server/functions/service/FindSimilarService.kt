package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.backend.similar.SimilarFinder
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.FileRecords
import com.heerkirov.hedge.server.dao.FindSimilarResults
import com.heerkirov.hedge.server.dao.FindSimilarTasks
import com.heerkirov.hedge.server.dao.Illusts
import com.heerkirov.hedge.server.dto.filter.FindSimilarResultQueryFilter
import com.heerkirov.hedge.server.dto.filter.FindSimilarTaskQueryFilter
import com.heerkirov.hedge.server.dto.form.FindSimilarResultProcessForm
import com.heerkirov.hedge.server.dto.form.FindSimilarTaskCreateForm
import com.heerkirov.hedge.server.dto.form.ImagePropsCloneForm
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.manager.IllustExtendManager
import com.heerkirov.hedge.server.model.FindSimilarResult
import com.heerkirov.hedge.server.utils.business.takeThumbnailFilepath
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.types.descendingOrderItem
import org.ktorm.dsl.*
import org.ktorm.entity.*

class FindSimilarService(private val data: DataRepository, private val illustExtendManager: IllustExtendManager, private val finder: SimilarFinder) {
    private val taskOrderTranslator = OrderTranslator {
        "id" to FindSimilarTasks.id
        "recordTime" to FindSimilarTasks.recordTime
    }

    private val resultOrderTranslator = OrderTranslator {
        "id" to FindSimilarResults.id
        "orderedId" to FindSimilarResults.ordered
        "recordTime" to FindSimilarResults.recordTime
    }

    fun listTask(filter: FindSimilarTaskQueryFilter): ListResult<FindSimilarTaskRes> {
        return data.db.from(FindSimilarTasks)
            .select()
            .limit(filter.offset, filter.limit)
            .orderBy(taskOrderTranslator, filter.order, default = descendingOrderItem("recordTime"))
            .toListResult { newFindSimilarTaskRes(FindSimilarTasks.createEntity(it)) }
    }

    fun createTask(form: FindSimilarTaskCreateForm): Int {
        data.db.transaction {
            return finder.add(form.selector, form.config)
        }
    }

    /**
     * @throws NotFound
     */
    fun getTask(id: Int): FindSimilarTaskRes {
        val task = data.db.sequenceOf(FindSimilarTasks).firstOrNull { it.id eq id } ?: throw be(NotFound())
        return newFindSimilarTaskRes(task)
    }

    /**
     * @throws NotFound
     */
    fun deleteTask(id: Int) {
        data.db.transaction {
            finder.delete(id)
        }
    }

    fun listResult(filter: FindSimilarResultQueryFilter): ListResult<FindSimilarResultRes> {
        val results = data.db.from(FindSimilarResults)
            .select()
            .limit(filter.offset, filter.limit)
            .orderBy(resultOrderTranslator, filter.order, default = descendingOrderItem("orderedId"))
            .toListResult { FindSimilarResults.createEntity(it) }

        val allImageIds = results.result.asSequence().flatMap { it.imageIds }.toSet()

        val images = data.db.from(Illusts)
            .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
            .select(Illusts.id, FileRecords.id, FileRecords.folder, FileRecords.extension, FileRecords.status)
            .where { Illusts.id inList allImageIds }
            .associate { it[Illusts.id]!! to IllustSimpleRes(it[Illusts.id]!!, takeThumbnailFilepath(it)) }

        return results.map { newFindSimilarResultRes(it, it.imageIds.mapNotNull(images::get)) }
    }

    /**
     * @throws NotFound
     */
    fun getResult(id: Int): FindSimilarResultRes {
        val result = data.db.sequenceOf(FindSimilarResults).firstOrNull { it.id eq id } ?: throw be(NotFound())

        val images = data.db.from(Illusts)
            .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
            .select(Illusts.id, FileRecords.id, FileRecords.folder, FileRecords.extension, FileRecords.status)
            .where { Illusts.id inList result.imageIds }
            .associate { it[Illusts.id]!! to IllustSimpleRes(it[Illusts.id]!!, takeThumbnailFilepath(it)) }

        return newFindSimilarResultRes(result, result.imageIds.mapNotNull(images::get))
    }

    /**
     * @throws ResourceNotExist number[]
     */
    fun batchProcessResult(form: FindSimilarResultProcessForm) {
        data.db.transaction {
            val results = if(form.target.isNullOrEmpty()) {
                data.db.sequenceOf(FindSimilarResults).toList()
            }else{
                data.db.sequenceOf(FindSimilarResults).filter { it.id inList form.target }.toList().also { results ->
                    if(results.size < form.target.size) {
                        val lacked = form.target.toSet() - results.map { it.id }.toSet()
                        throw be(ResourceNotExist("target", lacked))
                    }
                }
            }

            when(form.action) {
                FindSimilarResultProcessForm.Action.DELETE -> if(form.target.isNullOrEmpty()) {
                    data.db.deleteAll(FindSimilarResults)
                }else{
                    data.db.delete(FindSimilarResults) { it.id inList form.target }
                }
                FindSimilarResultProcessForm.Action.RETAIN_OLD -> results.forEach { processOneResult(it, "OLD", false) }
                FindSimilarResultProcessForm.Action.RETAIN_NEW -> results.forEach { processOneResult(it, "NEW", false) }
                FindSimilarResultProcessForm.Action.RETAIN_OLD_AND_CLONE_PROPS -> results.forEach { processOneResult(it, "OLD", true) }
                FindSimilarResultProcessForm.Action.RETAIN_NEW_AND_CLONE_PROPS -> results.forEach { processOneResult(it, "NEW", true) }
            }
        }
    }

    private fun processOneResult(result: FindSimilarResult, retain: String, cloneProps: Boolean) {
        val images = data.db.sequenceOf(Illusts).filter { it.id inList result.imageIds }.sortedBy { it.createTime }.toList()
        if(images.size > 1) {
            if(retain == "NEW") {
                if(cloneProps) {
                    illustExtendManager.cloneProps(images.first(), images.last(), ImagePropsCloneForm.Props(
                        score = true,
                        favorite = true,
                        description = true,
                        tagme = true,
                        metaTags = true,
                        collection = true,
                        books = true,
                        folders = true,
                        associate = true
                    ), merge = true)
                }

                for(illust in images.subList(0, images.size - 1)) {
                    illustExtendManager.delete(illust)
                }
            }else{
                if(cloneProps) {
                    illustExtendManager.cloneProps(images.last(), images.first(), ImagePropsCloneForm.Props(
                        score = true,
                        favorite = true,
                        description = true,
                        tagme = true,
                        metaTags = true,
                        collection = true,
                        books = true,
                        folders = true,
                        associate = true
                    ), merge = true)
                }

                for(illust in images.subList(1, images.size)) {
                    illustExtendManager.delete(illust)
                }
            }
        }

        data.db.delete(FindSimilarResults) { it.id eq result.id }
    }
}