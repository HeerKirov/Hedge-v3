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
import com.heerkirov.hedge.server.events.SimilarFinderResultResolved
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.manager.BookManager
import com.heerkirov.hedge.server.functions.manager.IllustManager
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.utils.Json.parseJSONObject
import com.heerkirov.hedge.server.utils.Json.toJsonNode
import com.heerkirov.hedge.server.utils.business.filePathOrNullFrom
import com.heerkirov.hedge.server.utils.business.map
import com.heerkirov.hedge.server.utils.business.toListResult
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.types.descendingOrderItem
import org.ktorm.dsl.*
import org.ktorm.entity.Tuple4
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
            .select(FindSimilarResults.id, FindSimilarResults.summaryTypes, FindSimilarResults.images, FindSimilarResults.recordTime)
            .limit(filter.offset, filter.limit)
            .orderBy(FindSimilarResults.sortPriority.desc(), FindSimilarResults.recordTime.desc())
            .toListResult {
                val id = it[FindSimilarResults.id]!!
                val summaryTypes = it[FindSimilarResults.summaryTypes]!!
                val images = it[FindSimilarResults.images]!!.map { i -> i.toInt() }
                val recordTime = it[FindSimilarResults.recordTime]!!
                Tuple4(id, summaryTypes, images, recordTime)
            }

        val illustIds = results.result.asSequence().map { (_, _, images, _) -> images }.flatten().toList()

        val imageFiles = data.db.from(Illusts)
            .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
            .select(Illusts.id, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { Illusts.id inList illustIds }
            .associate { it[Illusts.id]!! to filePathOrNullFrom(it) }

        return results.map { (id, s, i, r) ->
            val images = i.map {
                val filePath = imageFiles[it]
                FindSimilarResultImage(it, filePath)
            }
            FindSimilarResultRes(id, s, images, r)
        }
    }

    fun getResult(id: Int): FindSimilarResultDetailRes {
        val result = data.db.sequenceOf(FindSimilarResults).firstOrNull { it.id eq id } ?: throw be(NotFound())

        val illustIds = result.images.map { it.toInt() }.toList()

        val imageFiles = data.db.from(Illusts)
            .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
            .select(Illusts.id, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { Illusts.id inList illustIds }
            .associate { it[Illusts.id]!! to filePathOrNullFrom(it) }

        val images = illustIds.map {
            val filePath = imageFiles[it]
            FindSimilarResultImage(it, filePath)
        }

        val relations = result.relations.map { FindSimilarResultRelation(it.a, it.b, it.type, it.params) }

        return FindSimilarResultDetailRes(result.id, result.summaryTypes, images, relations, result.recordTime)
    }

    /**
     * @throws ResourceNotExist ("config.a"|"config.b", EntityKey)
     */
    fun resolveResult(id: Int, form: FindSimilarResultResolveForm) {
        data.db.transaction {
            val result = data.db.sequenceOf(FindSimilarResults).firstOrNull { it.id eq id } ?: throw be(NotFound())

            val entityKeys = result.images.map { it.toInt() }.toSet()

            //actions参数校验
            val actions = form.actions.map { action ->
                when(action.actionType) {
                    FindSimilarResultResolveForm.ActionType.CLONE_IMAGE,
                    FindSimilarResultResolveForm.ActionType.MARK_IGNORED -> {
                        if(action.b == null) throw be(ParamRequired("config.b"))
                    }
                    FindSimilarResultResolveForm.ActionType.DELETE,
                    FindSimilarResultResolveForm.ActionType.ADD_TO_BOOK,
                    FindSimilarResultResolveForm.ActionType.ADD_TO_COLLECTION -> {
                        if(action.b != null) throw be(ParamNotRequired("config.b"))
                    }
                }

                if(action.a !in entityKeys) throw be(ResourceNotExist("config.a", action.a))
                if(action.b != null && action.b !in entityKeys) throw be(ResourceNotExist("config.b", action.b))

                val config: Any? = try {
                    when(action.actionType) {
                        FindSimilarResultResolveForm.ActionType.CLONE_IMAGE -> action.config?.toJsonNode()?.parseJSONObject<FindSimilarResultResolveForm.CloneImageConfig>() ?: throw be(ParamRequired("config"))
                        FindSimilarResultResolveForm.ActionType.ADD_TO_COLLECTION -> action.config?.toJsonNode()?.parseJSONObject<FindSimilarResultResolveForm.AddToCollectionConfig>() ?: throw be(ParamRequired("config"))
                        FindSimilarResultResolveForm.ActionType.ADD_TO_BOOK -> action.config?.toJsonNode()?.parseJSONObject<FindSimilarResultResolveForm.AddToBookConfig>() ?: throw be(ParamRequired("config"))
                        else -> null
                    }
                }catch (e: Exception) {
                    throw be(ParamError("config"))
                }

                FindSimilarResultResolveForm.Resolution(action.a, action.b, action.actionType, config)
            }

            //actions依次执行。其中对image的collection/book更新会被收集起来批量执行
            val collectionToImages = mutableMapOf<Any, MutableList<Int>>()
            val bookToImages = mutableMapOf<Int, MutableList<Int>>()
            for (action in actions) {
                when(action.actionType) {
                    FindSimilarResultResolveForm.ActionType.CLONE_IMAGE -> {
                        val config = action.config as FindSimilarResultResolveForm.CloneImageConfig
                        illustManager.cloneProps(action.a, action.b!!, config.props, config.merge, config.deleteFrom)
                    }
                    FindSimilarResultResolveForm.ActionType.ADD_TO_COLLECTION -> {
                        val config = action.config as FindSimilarResultResolveForm.AddToCollectionConfig
                        collectionToImages.computeIfAbsent(config.collectionId) { mutableListOf() }.add(action.a)
                    }
                    FindSimilarResultResolveForm.ActionType.ADD_TO_BOOK -> {
                        val config = action.config as FindSimilarResultResolveForm.AddToBookConfig
                        bookToImages.computeIfAbsent(config.bookId) { mutableListOf() }.add(action.a)
                    }
                    FindSimilarResultResolveForm.ActionType.DELETE -> {
                        val illust = data.db.sequenceOf(Illusts).firstOrNull { it.id eq action.a }
                        if(illust != null) illustManager.delete(illust)
                    }
                    FindSimilarResultResolveForm.ActionType.MARK_IGNORED -> {
                        val ak = action.a.toString()
                        val bk = action.b!!.toString()
                        val exist = data.db.from(FindSimilarIgnores)
                            .select((count() greater 0).aliased("exist"))
                            .where { (FindSimilarIgnores.firstTarget eq ak) and (FindSimilarIgnores.secondTarget eq bk) }
                            .map { it.getBoolean("exist") }
                            .first()

                        if(!exist) {
                            val now = Instant.now()
                            data.db.insert(FindSimilarIgnores) {
                                set(it.firstTarget, ak)
                                set(it.secondTarget, bk)
                                set(it.recordTime, now)
                            }
                            data.db.insert(FindSimilarIgnores) {
                                set(it.firstTarget, bk)
                                set(it.secondTarget, ak)
                                set(it.recordTime, now)
                            }
                        }
                    }
                }
            }

            //有关collection有些特别机制，因此需要全部提取到一起执行。
            //collectionId可以设置为string，表示导入后会创建一个新collection。
            for ((collectionId, entities) in collectionToImages) {
                when (collectionId) {
                    is Int -> {
                        val images = illustManager.unfoldImages(entities + listOf(collectionId), sorted = false)
                        illustManager.updateImagesInCollection(collectionId, images)
                    }
                    is String -> if(entities.isNotEmpty()) {
                        illustManager.newCollection(entities, "", null, null, Illust.Tagme.EMPTY)
                    }
                    else -> throw be(ParamTypeError("config.collectionId", "must be number or string."))
                }
            }
            for ((bookId, imageIds) in bookToImages) {
                bookManager.addImagesInBook(bookId, imageIds, null)
            }

            data.db.delete(FindSimilarResults) { it.id eq id }

            bus.emit(SimilarFinderResultResolved(id))
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