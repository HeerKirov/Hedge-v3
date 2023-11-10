package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.backend.similar.SimilarFinder
import com.heerkirov.hedge.server.components.backend.similar.getSimilarityCategory
import com.heerkirov.hedge.server.components.backend.similar.getSummaryType
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
import com.heerkirov.hedge.server.model.FindSimilarResult
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.utils.DateTime.toInstant
import com.heerkirov.hedge.server.utils.business.*
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.mapEachTwo
import com.heerkirov.hedge.server.utils.tuples.Tuple6
import com.heerkirov.hedge.server.utils.types.descendingOrderItem
import org.ktorm.dsl.*
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import java.time.Instant
import kotlin.math.max
import kotlin.math.min

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

        val images = data.db.from(Illusts)
            .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
            .select(Illusts.id, Illusts.favorite, Illusts.score, Illusts.orderTime,
                Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, Illusts.sourcePartName,
                FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { Illusts.id inList result.imageIds }
            .orderBy(Illusts.orderTime.asc())
            .map {
                val filePath = filePathFrom(it)
                val illustId = it[Illusts.id]!!
                val score = it[Illusts.score]
                val favorite = it[Illusts.favorite]!!
                val orderTime = it[Illusts.orderTime]!!.toInstant()
                val source = sourcePathOf(it)
                FindSimilarDetailResultImage(illustId, filePath, favorite, score, orderTime, source)
            }

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
            val ignoredEdges = mutableListOf<Pair<Int, Int>>()
            val ignoredSourceBooks = mutableSetOf<FindSimilarResult.SourceBookCoverage>()
            val ignoredSourceDatas = mutableSetOf<FindSimilarResult.SourceIdentitySimilarCoverage>()
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
                            ignoredEdges.add(action.from to action.to)
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
                                ignoredSourceBooks.add(FindSimilarResult.SourceBookCoverage(action.site, action.sourceBookCode))
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
                                ignoredSourceDatas.add(FindSimilarResult.SourceIdentitySimilarCoverage(action.site, action.sourceId))
                            }
                        }
                    }
                }
            }

            val newCollectionIds = mutableMapOf<String, Int>()
            for ((collectionId, imageIds) in collectionToImages) {
                when (collectionId) {
                    is Int -> {
                        val images = illustManager.unfoldImages(imageIds + listOf(collectionId), sorted = false)
                        illustManager.updateImagesInCollection(collectionId, images)
                    }
                    is String -> if(imageIds.isNotEmpty()) {
                        //collectionId可以设置为string，表示会创建新collection，相同字符串的会被创建到同一个collection中
                        newCollectionIds[collectionId] = illustManager.newCollection(imageIds, "", null, null, Illust.Tagme.EMPTY)
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
                computeResultChange(result, collectionToImages.mapKeys { (k, _) -> if(k is Int) k else newCollectionIds[k as String]!! }, bookToImages, toBeDeleted, ignoredEdges, ignoredSourceBooks, ignoredSourceDatas)
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

    private fun computeResultChange(result: FindSimilarResult,
                                    addToCollections: Map<Int, List<Int>>,
                                    addToBooks: Map<Int, List<Int>>,
                                    deleted: Set<Int>,
                                    ignoredEdges: List<Pair<Int, Int>>,
                                    ignoredSourceBooks: Set<FindSimilarResult.SourceBookCoverage>,
                                    ignoredSourceDatas: Set<FindSimilarResult.SourceIdentitySimilarCoverage>): FindSimilarResult {
        val imageIds = if(deleted.isNotEmpty()) result.imageIds.filter { it !in deleted } else result.imageIds

        val newEdgesFromIgnored = ignoredEdges.map { FindSimilarResult.RelationEdge(it.first, it.second, FindSimilarResult.Ignored) }
        val edges = (newEdgesFromIgnored + result.edges).filter { it.a !in deleted && it.b !in deleted }

        val imageToNewCollections = addToCollections.asSequence().flatMap { (k, v) -> v.map { it to k } }.toMap()
        val newCoveragesFromBook = addToBooks.asSequence()
            .filter { (bookId, _) -> result.coverages.none { it.info is FindSimilarResult.BookCoverage && it.info.bookId == bookId } }
            .map { (bookId, i) -> FindSimilarResult.RelationCoverage(i, FindSimilarResult.BookCoverage(bookId), ignored = false) }
        val newCoveragesFromCollection = addToCollections.asSequence()
            .filter { (cid, _) -> result.coverages.none { it.info is FindSimilarResult.CollectionCoverage && it.info.collectionId == cid } }
            .map { (cid, i) -> FindSimilarResult.RelationCoverage(i, FindSimilarResult.CollectionCoverage(cid), ignored = false) }
        val filteredCoverages = result.coverages.asSequence()
            .mapNotNull { coverage ->
                when(coverage.info) {
                    is FindSimilarResult.BookCoverage -> {
                        val appendImageIds = addToBooks[coverage.info.bookId] ?: emptyList()
                        if(appendImageIds.isNotEmpty()) {
                            FindSimilarResult.RelationCoverage((coverage.imageIds + appendImageIds).distinct(), coverage.info, coverage.ignored)
                        }else{
                            coverage
                        }
                    }
                    is FindSimilarResult.CollectionCoverage -> {
                        val appendImageIds = addToCollections.getOrDefault(coverage.info.collectionId, emptyList())
                        val filteredImageIds = if(imageToNewCollections.isEmpty()) coverage.imageIds else coverage.imageIds.filter {
                            val movedCollection = imageToNewCollections[it]
                            movedCollection == null || movedCollection == coverage.info.collectionId
                        }
                        if(appendImageIds.isNotEmpty() || filteredImageIds.size < coverage.imageIds.size) {
                            val newImageIds = (coverage.imageIds + appendImageIds).distinct()
                            if(newImageIds.isNotEmpty()) {
                                FindSimilarResult.RelationCoverage(newImageIds, coverage.info, coverage.ignored)
                            }else{
                                null
                            }
                        }else{
                            coverage
                        }
                    }
                    is FindSimilarResult.SourceBookCoverage -> {
                        if(ignoredSourceBooks.isNotEmpty() && coverage.info in ignoredSourceBooks) {
                            FindSimilarResult.RelationCoverage(coverage.imageIds, coverage.info, ignored = true)
                        }else{
                            coverage
                        }
                    }
                    is FindSimilarResult.SourceIdentitySimilarCoverage -> {
                        if(ignoredSourceDatas.isNotEmpty() && coverage.info in ignoredSourceDatas) {
                            FindSimilarResult.RelationCoverage(coverage.imageIds, coverage.info, ignored = true)
                        }else{
                            coverage
                        }
                    }
                }
            }

        val coverages = (filteredCoverages + newCoveragesFromBook + newCoveragesFromCollection)
            .mapNotNull { coverage ->
                val filteredImageIds = coverage.imageIds.minus(deleted)
                if(filteredImageIds.isEmpty()) {
                    null
                }else if(filteredImageIds.size < coverage.imageIds.size) {
                    FindSimilarResult.RelationCoverage(filteredImageIds, coverage.info, coverage.ignored)
                }else{
                    coverage
                }
            }
            .toList()

        val edgeTypes = edges.asSequence().map { it.info }.toSet()
        val category = getSimilarityCategory(edgeTypes)
        val summaryType = getSummaryType(edgeTypes)
        val resolved = computeResultResolved(imageIds, edges, coverages)

        return FindSimilarResult(result.id, category, summaryType, resolved, imageIds, edges, coverages, result.recordTime)
    }

    private fun computeResultResolved(imageIds: List<Int>, edges: List<FindSimilarResult.RelationEdge>, coverages: List<FindSimilarResult.RelationCoverage>): Boolean {
        //从每个节点出发，沿边尝试访问所有节点，只要存在任意一个可连通的有效关系，就认为尚未resolved

        //将coverages转换为a->b的边结构。总是保持a<b，且在后面附上existed标记
        val r1 = coverages
            .flatMap {  coverage -> coverage.imageIds.mapEachTwo { a, b -> min(a, b) to (max(a, b) to coverage.ignored) } }
            .groupBy({ it.first }) { it.second }
        //将edges转换为a->b的边结构。总是保持a<b，且在后面附上existed标记
        val r2 = edges
            .groupBy({ min(it.a, it.b) }) { max(it.a, it.b) to (it.info is FindSimilarResult.Associated || it.info is FindSimilarResult.Ignored) }

        //取出每个节点的所有边，然后按照目标节点对边分类，使与同一个节点连接的边分到一组里。
        //随后统计每个组中existed标记的数量。只要数量不为0，就表示当前节点与目标节点的连接是existed relation。
        //最后，只需要查看所有边中是否还存在NOT existed relation即可。如果存在就是NOT resolved。
        return imageIds.asSequence()
            .map { key ->
                ((r1[key] ?: emptyList()) + (r2[key] ?: emptyList()))
                    .groupBy({ it.first }) { it.second }
                    .values
                    .map { it.indexOf(true) >= 0 }
            }
            .flatten()
            .all { it }
    }
}