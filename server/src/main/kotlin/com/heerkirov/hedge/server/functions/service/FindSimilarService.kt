package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.backend.similar.SimilarFinder
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.filter.FindSimilarTaskQueryFilter
import com.heerkirov.hedge.server.dto.filter.LimitAndOffsetFilter
import com.heerkirov.hedge.server.dto.form.FindSimilarResultResolveForm
import com.heerkirov.hedge.server.dto.form.FindSimilarTaskCreateForm
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.events.SimilarFinderResultDeleted
import com.heerkirov.hedge.server.events.SimilarFinderResultUpdated
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.manager.BookManager
import com.heerkirov.hedge.server.functions.manager.IllustManager
import com.heerkirov.hedge.server.model.FindSimilarIgnored
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.utils.business.filePathOrNullFrom
import com.heerkirov.hedge.server.utils.business.map
import com.heerkirov.hedge.server.utils.business.toListResult
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.tuples.Tuple6
import com.heerkirov.hedge.server.utils.types.descendingOrderItem
import org.ktorm.dsl.*
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import java.time.Instant

class FindSimilarService(private val data: DataRepository,
                         private val bus: EventBus,
                         private val finder: SimilarFinder,
                         private val illustManager: IllustManager,
                         private val bookManager: BookManager) {
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
            .select(FindSimilarResults.id, FindSimilarResults.category, FindSimilarResults.summaryType, FindSimilarResults.imageIds, FindSimilarResults.resolved, FindSimilarResults.recordTime)
            .limit(filter.offset, filter.limit)
            .orderBy(FindSimilarResults.category.asc(), FindSimilarResults.recordTime.desc())
            .toListResult {
                val id = it[FindSimilarResults.id]!!
                val category = it[FindSimilarResults.category]!!
                val summaryType = it[FindSimilarResults.summaryType]!!
                val imageIds = it[FindSimilarResults.imageIds]!!
                val resolved = it[FindSimilarResults.resolved]!!
                val recordTime = it[FindSimilarResults.recordTime]!!
                Tuple6(id, category, summaryType, imageIds, resolved, recordTime)
            }

        val illustIds = results.result.asSequence().map { (_, _, _, images, _, _) -> images }.flatten().toList()

        val imageFiles = data.db.from(Illusts)
            .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
            .select(Illusts.id, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { Illusts.id inList illustIds }
            .associateBy({ it[Illusts.id]!! }) { filePathOrNullFrom(it) }

        return results.map { (id, c, s, i, d, r) ->
            val images = i.map { FindSimilarResultImage(it, imageFiles[it]) }
            FindSimilarResultRes(id, c, s, images, d, r)
        }
    }

    fun getResult(id: Int): FindSimilarResultDetailRes {
        val result = data.db.sequenceOf(FindSimilarResults).firstOrNull { it.id eq id } ?: throw be(NotFound())

        val imageFiles = data.db.from(Illusts)
            .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
            .select(Illusts.id, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { Illusts.id inList result.imageIds }
            .associate { it[Illusts.id]!! to filePathOrNullFrom(it) }

        val images = result.imageIds.map { FindSimilarResultImage(it, imageFiles[it]) }

        return FindSimilarResultDetailRes(result.id, result.category, result.summaryType, images, result.edges, result.coverages, result.resolved, result.recordTime)
    }

    /**
     * @throws ResourceNotExist ("from"|"to", number)
     * @throws ResourceNotExist ("imageIds", number[])
     */
    fun resolveResult(id: Int, form: FindSimilarResultResolveForm) {
        data.db.transaction {
            val result = data.db.sequenceOf(FindSimilarResults).firstOrNull { it.id eq id } ?: throw be(NotFound())

            val entityKeys = result.imageIds.toSet()

            //actions参数校验
            for (action in form.actions) {
                when(action) {
                    is FindSimilarResultResolveForm.ResolutionForTwoImage -> if(action.from !in entityKeys) {
                        throw be(ResourceNotExist("from", action.from))
                    }else if(action.to !in entityKeys) {
                        throw be(ResourceNotExist("to", action.to))
                    }
                    is FindSimilarResultResolveForm.ResolutionForMultipleImage -> if(!entityKeys.containsAll(action.imageIds)) {
                        throw be(ResourceNotExist("imageIds", action.imageIds.filter { it !in entityKeys }))
                    }
                    else -> {}
                }
            }

            //actions依次执行。其中对image的collection/book更新会被收集起来批量执行
            val collectionToImages = mutableMapOf<Any, MutableList<Int>>()
            val bookToImages = mutableMapOf<Int, MutableList<Int>>()
            val toBeDeleted = mutableSetOf<Int>()
            for (action in form.actions) {
                when(action) {
                    is FindSimilarResultResolveForm.CloneImageResolution -> {
                        illustManager.cloneProps(action.from, action.to, action.props, action.merge, action.deleteFrom)
                    }
                    is FindSimilarResultResolveForm.AddToCollectionResolution -> {
                        collectionToImages.computeIfAbsent(action.collectionId) { mutableListOf() }.addAll(action.imageIds)
                    }
                    is FindSimilarResultResolveForm.AddToBookResolution -> {
                        bookToImages.computeIfAbsent(action.bookId) { mutableListOf() }.addAll(action.imageIds)
                    }
                    is FindSimilarResultResolveForm.DeleteResolution -> {
                        toBeDeleted.addAll(action.imageIds)
                    }
                    is FindSimilarResultResolveForm.MarkIgnoredResolution -> {
                        val exist = data.db.from(FindSimilarIgnores)
                            .select((count() greater 0).aliased("exist"))
                            .where { (FindSimilarIgnores.type eq FindSimilarIgnored.IgnoredType.EDGE) and (FindSimilarIgnores.firstTarget eq action.from) and (FindSimilarIgnores.secondTarget eq action.to) }
                            .map { it.getBoolean("exist") }
                            .first()

                        if(!exist) {
                            val now = Instant.now()
                            data.db.insert(FindSimilarIgnores) {
                                set(it.type, FindSimilarIgnored.IgnoredType.EDGE)
                                set(it.firstTarget, action.from)
                                set(it.secondTarget, action.to)
                                set(it.recordTime, now)
                            }
                            data.db.insert(FindSimilarIgnores) {
                                set(it.type, FindSimilarIgnored.IgnoredType.EDGE)
                                set(it.firstTarget, action.to)
                                set(it.secondTarget, action.from)
                                set(it.recordTime, now)
                            }
                        }
                    }
                    is FindSimilarResultResolveForm.MarkIgnoredSourceBookResolution -> {
                        val sourceBookId = data.db.from(SourceBooks)
                            .select(SourceBooks.id)
                            .where { SourceBooks.site eq action.site and (SourceBooks.code eq action.sourceBookCode) }
                            .firstOrNull()
                            ?.get(SourceBooks.id)

                        if(sourceBookId != null) {
                            val exist = data.db.from(FindSimilarIgnores)
                                .select((count() greater 0).aliased("exist"))
                                .where { (FindSimilarIgnores.type eq FindSimilarIgnored.IgnoredType.SOURCE_BOOK) and (FindSimilarIgnores.firstTarget eq sourceBookId) }
                                .map { it.getBoolean("exist") }
                                .first()

                            if(!exist) {
                                val now = Instant.now()
                                data.db.insert(FindSimilarIgnores) {
                                    set(it.type, FindSimilarIgnored.IgnoredType.SOURCE_BOOK)
                                    set(it.firstTarget, sourceBookId)
                                    set(it.secondTarget, null)
                                    set(it.recordTime, now)
                                }
                            }
                        }

                    }
                    is FindSimilarResultResolveForm.MarkIgnoredSourceDataResolution -> {
                        val sourceDataId = data.db.from(SourceDatas)
                            .select(SourceDatas.id)
                            .where { SourceDatas.sourceSite eq action.site and (SourceDatas.sourceId eq action.sourceId) }
                            .firstOrNull()
                            ?.get(SourceDatas.id)

                        if(sourceDataId != null) {
                            val exist = data.db.from(FindSimilarIgnores)
                                .select((count() greater 0).aliased("exist"))
                                .where { (FindSimilarIgnores.type eq FindSimilarIgnored.IgnoredType.SOURCE_IDENTITY_SIMILAR) and (FindSimilarIgnores.firstTarget eq sourceDataId) }
                                .map { it.getBoolean("exist") }
                                .first()

                            if(!exist) {
                                val now = Instant.now()
                                data.db.insert(FindSimilarIgnores) {
                                    set(it.type, FindSimilarIgnored.IgnoredType.SOURCE_IDENTITY_SIMILAR)
                                    set(it.firstTarget, sourceDataId)
                                    set(it.secondTarget, null)
                                    set(it.recordTime, now)
                                }
                            }
                        }
                    }
                }
            }

            for ((collectionId, imageIds) in collectionToImages) {
                when (collectionId) {
                    is Int -> {
                        val images = illustManager.unfoldImages(imageIds + listOf(collectionId), sorted = false)
                        illustManager.updateImagesInCollection(collectionId, images)
                    }
                    is String -> if(imageIds.isNotEmpty()) {
                        //collectionId可以设置为string，表示会创建新collection，相同字符串的会被创建到同一个collection中
                        illustManager.newCollection(imageIds, "", null, null, Illust.Tagme.EMPTY)
                    }
                    else -> throw be(ParamTypeError("config.collectionId", "must be number or string."))
                }
            }
            for ((bookId, imageIds) in bookToImages) {
                bookManager.addImagesInBook(bookId, imageIds, null)
            }
            if (toBeDeleted.isNotEmpty()) {
                illustManager.unfoldImages(toBeDeleted.toList()).forEach(illustManager::delete)
            }

            if (form.clear) {
                data.db.delete(FindSimilarResults) { it.id eq id }
                bus.emit(SimilarFinderResultDeleted(id))
            }else{
                bus.emit(SimilarFinderResultUpdated(id))
            }

        }
    }

    fun deleteResult(id: Int) {
        data.db.transaction {
            data.db.sequenceOf(FindSimilarResults).firstOrNull { it.id eq id } ?: throw be(NotFound())

            data.db.delete(FindSimilarResults) { it.id eq id }

            bus.emit(SimilarFinderResultDeleted(id))
        }
    }
}