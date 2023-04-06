package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.backend.similar.SimilarFinder
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.filter.FindSimilarTaskQueryFilter
import com.heerkirov.hedge.server.dto.filter.LimitAndOffsetFilter
import com.heerkirov.hedge.server.dto.form.FindSimilarTaskCreateForm
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.FindSimilarEntityType
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.manager.IllustExtendManager
import com.heerkirov.hedge.server.utils.business.takeThumbnailFilepath
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.types.descendingOrderItem
import com.heerkirov.hedge.server.utils.types.toEntityKey
import org.ktorm.dsl.*
import org.ktorm.entity.*

class FindSimilarService(private val data: DataRepository,
                         private val illustExtendManager: IllustExtendManager,
                         private val finder: SimilarFinder) {
    private val taskOrderTranslator = OrderTranslator {
        "id" to FindSimilarTasks.id
        "recordTime" to FindSimilarTasks.recordTime
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

    fun listResult(filter: LimitAndOffsetFilter): ListResult<FindSimilarResultRes> {
        val results = data.db.from(FindSimilarResults)
            .select(FindSimilarResults.id, FindSimilarResults.summaryTypes, FindSimilarResults.images, FindSimilarResults.recordTime)
            .limit(filter.offset, filter.limit)
            .orderBy(FindSimilarResults.sortPriority.desc(), FindSimilarResults.recordTime.desc())
            .toListResult {
                val id = it[FindSimilarResults.id]!!
                val summaryTypes = it[FindSimilarResults.summaryTypes]!!
                val images = it[FindSimilarResults.images]!!.map { i -> i.toEntityKey() }
                val recordTime = it[FindSimilarResults.recordTime]!!
                Tuple4(id, summaryTypes, images, recordTime)
            }

        val imageKeys = results.result.asSequence().map { (_, _, images, _) -> images }.flatten().toList()
        val illustIds = imageKeys.filter { it.type == FindSimilarEntityType.ILLUST }.map { it.id }
        val importIds = imageKeys.filter { it.type == FindSimilarEntityType.IMPORT_IMAGE }.map { it.id }

        val imageFiles = data.db.from(Illusts)
            .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
            .select(Illusts.id, FileRecords.id, FileRecords.folder, FileRecords.extension, FileRecords.status)
            .where { Illusts.id inList illustIds }
            .associate { it[Illusts.id]!! to takeThumbnailFilepath(it) }
        val importFiles = data.db.from(ImportImages)
            .innerJoin(FileRecords, FileRecords.id eq ImportImages.fileId)
            .select(ImportImages.id, FileRecords.id, FileRecords.folder, FileRecords.extension, FileRecords.status)
            .where { ImportImages.id inList importIds }
            .associate { it[ImportImages.id]!! to takeThumbnailFilepath(it) }

        return results.map { (id, s, i, r) ->
            val images = i.map {
                val thumbnailFile = if(it.type == FindSimilarEntityType.ILLUST) imageFiles[it.id] else importFiles[it.id]
                FindSimilarResultImage(it.type, it.id, thumbnailFile)
            }
            FindSimilarResultRes(id, s, images, r)
        }
    }

    fun getResult(id: Int): FindSimilarResultDetailRes {
        val result = data.db.sequenceOf(FindSimilarResults).firstOrNull { it.id eq id } ?: throw be(NotFound())

        val imageKeys = result.images.map { it.toEntityKey() }.toList()
        val illustIds = imageKeys.filter { it.type == FindSimilarEntityType.ILLUST }.map { it.id }
        val importIds = imageKeys.filter { it.type == FindSimilarEntityType.IMPORT_IMAGE }.map { it.id }

        val imageFiles = data.db.from(Illusts)
            .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
            .select(Illusts.id, FileRecords.id, FileRecords.folder, FileRecords.extension, FileRecords.status)
            .where { Illusts.id inList illustIds }
            .associate { it[Illusts.id]!! to takeThumbnailFilepath(it) }
        val importFiles = data.db.from(ImportImages)
            .innerJoin(FileRecords, FileRecords.id eq ImportImages.fileId)
            .select(ImportImages.id, FileRecords.id, FileRecords.folder, FileRecords.extension, FileRecords.status)
            .where { ImportImages.id inList importIds }
            .associate { it[ImportImages.id]!! to takeThumbnailFilepath(it) }

        val images = imageKeys.map {
            val thumbnailFile = if(it.type == FindSimilarEntityType.ILLUST) imageFiles[it.id] else importFiles[it.id]
            FindSimilarResultImage(it.type, it.id, thumbnailFile)
        }

        val relations = result.relations.map { FindSimilarResultRelation(it.a.toEntityKey(), it.b.toEntityKey(), it.type, it.params) }

        return FindSimilarResultDetailRes(result.id, result.summaryTypes, images, relations, result.recordTime)
    }
}