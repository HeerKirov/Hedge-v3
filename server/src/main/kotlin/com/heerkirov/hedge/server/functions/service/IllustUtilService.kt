package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.backend.similar.Fingerprint
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.form.IllustBatchUpdateForm
import com.heerkirov.hedge.server.dto.form.OrganizationSituationApplyForm
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.functions.manager.IllustManager
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.utils.*
import com.heerkirov.hedge.server.utils.DateTime.toInstant
import com.heerkirov.hedge.server.utils.business.filePathFrom
import com.heerkirov.hedge.server.utils.business.sourcePathComparator
import com.heerkirov.hedge.server.utils.business.sourcePathOf
import com.heerkirov.hedge.server.utils.types.optOf
import org.ktorm.dsl.*
import org.ktorm.entity.filter
import org.ktorm.entity.sequenceOf
import org.ktorm.entity.toList
import java.time.Instant

class IllustUtilService(private val appdata: AppDataManager, private val data: DataRepository, private val illustManager: IllustManager) {
    /**
     * 查询一组illust的collection所属情况，列出这些illust已经属于的所有collection，以及按照时间分区划分，来提示是否需要集中时间分区。
     * 这个工具API一般用于创建collection或向collection添加图像之前，对内容列表校验，以提示用户如何创建collection或添加图像。
     */
    fun getCollectionSituation(illustIds: List<Int>, exampleCount: Int = 5): List<CollectionSituationRes> {
        val illusts = data.db.sequenceOf(Illusts).filter { it.id inList illustIds }.toList()
        val collectionResult = illusts.filter { it.type == IllustModelType.COLLECTION }
        val imageWithParentResult = illusts.filter { it.type == IllustModelType.IMAGE_WITH_PARENT }

        val collectionResultIds = collectionResult.asSequence().map { it.id }.toSet()
        val imageResultParentIds = imageWithParentResult.asSequence().map { it.parentId!! }.filter { it !in collectionResultIds }.toSet()
        val imageParentResult = data.db.sequenceOf(Illusts).filter { (it.id inList imageResultParentIds) and (it.type eq IllustModelType.COLLECTION) }.toList()

        val images = illusts.asSequence()
            .filter { it.type == IllustModelType.IMAGE }.sortedBy { it.orderTime }.toList()
            .let {
                val files = data.db.from(Illusts)
                    .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
                    .select(Illusts.id, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
                    .where { (Illusts.id inList it.map(Illust::id)) and (Illusts.type eq IllustModelType.IMAGE) }
                    .map { row ->
                        val itemId = row[Illusts.id]!!
                        val filePath = filePathFrom(row)
                        IllustSimpleRes(itemId, filePath)
                    }.associateBy(IllustSimpleRes::id)
                it.map { i -> i to files[i.id]!! }
            }
        val collections = (collectionResult.asSequence() + imageParentResult.asSequence())
            .sortedBy { it.orderTime }
            .map {
                val examples = data.db.from(Illusts)
                    .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
                    .select(Illusts.id, Illusts.type, Illusts.exportedScore, Illusts.favorite, Illusts.tagme, Illusts.orderTime,
                        FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
                    .where { (Illusts.parentId eq it.id) and (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT) }
                    .orderBy(Illusts.orderTime.asc())
                    .limit(exampleCount)
                    .map { row ->
                        val itemId = row[Illusts.id]!!
                        val filePath = filePathFrom(row)
                        IllustSimpleRes(itemId, filePath)
                    }

                val belongs = imageWithParentResult
                    .filter { image -> image.parentId == it.id }
                    .map { image -> image.id }
                    .letIf(it.id in collectionResultIds) { l -> l + it.id }

                it to CollectionSituationRes.Collection(it.id, it.cachedChildrenCount, it.orderTime.toInstant(), examples, belongs)
            }
            .toList()

        //启用此选项时，将按时间分区分割结果
        return if(appdata.setting.meta.centralizeCollection) {
            (collectionResult.asSequence().map { it.partitionTime } + imageParentResult.asSequence().map { it.partitionTime } + images.asSequence().map { (i, _) -> i.partitionTime })
                .distinct()
                .sorted()
                .map { pt ->
                    val partitionedImages = images.filter { (i, _) -> i.partitionTime == pt }.map { (_, i) -> i }
                    val partitionedCollections = collections.filter { (i, _) -> i.partitionTime == pt }.map { (_, c) -> c }
                    CollectionSituationRes(pt, partitionedCollections, partitionedImages)
                }
                .toList()
        }else{
            listOf(CollectionSituationRes(null, collections.map { (_, c) -> c }, images.map { (_, i) -> i }))
        }
    }

    /**
     * 查询一组illust中，所有的image和collection下属的image。同时，列出每个image的所属集合。
     * 这个工具API一般用于拖放illusts后，对内容列表做整体解析。
     */
    fun getImageSituation(illustIds: List<Int>): List<ImageSituationRes> {
        data class Row(val id: Int, val type: IllustModelType, val parentId: Int?, val childrenCount: Int?, val orderTime: Instant, val filePath: FilePath)
        data class ChildrenRow(val id: Int, val parentId: Int, val orderTime: Instant, val filePath: FilePath)
        //先根据id列表把所有的illust查询出来, 然后从中分离collection, image, image_with_parent
        val rows = data.db.from(Illusts)
            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
            .select(Illusts.id, Illusts.type, Illusts.parentId, Illusts.orderTime, Illusts.cachedChildrenCount, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { Illusts.id inList illustIds }
            .map { row ->
                val filePath = filePathFrom(row)
                Row(row[Illusts.id]!!, row[Illusts.type]!!, row[Illusts.parentId], row[Illusts.cachedChildrenCount], row[Illusts.orderTime]!!.toInstant(), filePath)
            }
            .groupBy { it.type }
        val collectionRows = rows.getOrDefault(IllustModelType.COLLECTION, emptyList())
        val imageRows = rows.getOrDefault(IllustModelType.IMAGE, emptyList())
        val imageWithParentRows = rows.getOrDefault(IllustModelType.IMAGE_WITH_PARENT, emptyList())

        //对于collection，查询下属的所有children
        val childrenRows = data.db.from(Illusts)
            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
            .select(Illusts.id, Illusts.parentId, Illusts.orderTime, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { (Illusts.parentId inList collectionRows.map { it.id }) and (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT) }
            .map { row ->
                val filePath = filePathFrom(row)
                ChildrenRow(row[Illusts.id]!!, row[Illusts.parentId]!!, row[Illusts.orderTime]!!.toInstant(), filePath)
            }

        //查询image_with_parent类图像的parent信息。查询时排除collection已有的项
        val imageWithParentIds = imageWithParentRows.asSequence().map { it.parentId!! }.toSet() - collectionRows.asSequence().map { it.id }.toSet()
        val parentsOfImages = data.db.from(Illusts)
            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
            .select(Illusts.id, Illusts.cachedChildrenCount, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { (Illusts.id inList imageWithParentIds) and (Illusts.type eq IllustModelType.COLLECTION) }
            .associate {
                val id = it[Illusts.id]!!
                val filePath = filePathFrom(it)
                id to IllustParent(id, filePath, it[Illusts.cachedChildrenCount]!!)
            }
        //将collection转换为children类图像的parent信息
        val parentsOfChildren = collectionRows.associate { it.id to IllustParent(it.id, it.filePath, it.childrenCount!!) }
        //联立成完全的parent查询表
        val allParents = parentsOfImages + parentsOfChildren

        //将childrenRows和imageRows组合编排成结果集
        val childrenResult = childrenRows.asSequence().map { ImageSituationRes(it.id, it.filePath, it.orderTime, allParents[it.parentId]) }
        val imageResult = imageRows.asSequence().map { ImageSituationRes(it.id, it.filePath, it.orderTime, null) }
        val imageWithParentResult = imageWithParentRows.asSequence().map { ImageSituationRes(it.id, it.filePath, it.orderTime, allParents[it.parentId]) }

        return (childrenResult + imageResult + imageWithParentResult).distinctBy { it.id }.sortedBy { it.orderTime }.toList()
    }

    /**
     * 查询一组illust对目标book的所属情况。列出所有展开后的images，并点出哪些image已属于此book。
     */
    fun getBookSituation(illustIds: List<Int>, bookId: Int, onlyExists: Boolean): List<BookSituationRes> {
        val result = getBookOrFolderSituationCommons(illustIds)

        //从book中查询已存在的项
        val resultIds = result.map { it.first }
        val exists = data.db.from(BookImageRelations).select(BookImageRelations.imageId, BookImageRelations.ordinal)
            .where { (BookImageRelations.bookId eq bookId) and (BookImageRelations.imageId inList resultIds) }
            .map { Pair(it[BookImageRelations.imageId]!!, it[BookImageRelations.ordinal]!!) }
            .toMap()

        return result.map { BookSituationRes(it.first, it.second, exists[it.first]) }.letIf(onlyExists) { it.filter { r -> r.ordinal != null } }
    }

    /**
     * 查询一组illust对目标folder的所属情况。列出所有展开后的images，并点出哪些image已属于此folder。
     */
    fun getFolderSituation(illustIds: List<Int>, folderId: Int, onlyExists: Boolean): List<FolderSituationRes> {
        val result = getBookOrFolderSituationCommons(illustIds)

        //从folder中查询已存在的项
        val resultIds = result.map { it.first }
        val exists = data.db.from(FolderImageRelations).select(FolderImageRelations.imageId, FolderImageRelations.ordinal)
            .where { (FolderImageRelations.folderId eq folderId) and (FolderImageRelations.imageId inList resultIds) }
            .map { Pair(it[FolderImageRelations.imageId]!!, it[FolderImageRelations.ordinal]!!) }
            .toMap()

        return result.map { FolderSituationRes(it.first, it.second, exists[it.first]) }.letIf(onlyExists) { it.filter { r -> r.ordinal != null } }
    }

    /**
     * 对一组illust进行智能整理。整理的基本原则是将相似项划分为一个集合，搭配有一些其他的分组选项使用。
     * 此方法仅返回分组结果，分组的实施需要手动完成。
     * @param illustIds 给出image
     * @param onlyNeighbours 仅有相邻的图像会被划分为一个集合，当图像不相邻时就不会成组了。
     * @param gatherGroup 分组划分完成后，进行重排序，使同一个组的项聚拢到一起，多个组的排序顺序由这个组中最靠前的项决定。onlyNeighbours开启时，此选项显然无意义。
     * @param resortInGroup 分组划分完成后，进行重排序，在每个组内按照来源顺序重新组织排序时间。resortAtAll开启时，此选项显然无意义。
     * @param resortAtAll 分组划分开始之前就进行一次全局重排序，按照来源顺序重新组织排序时间。
     * @return 多个组，每个组包含多个图像，用以指示哪些图像需要被成组。有些图像还带有orderTime，用以指示需要设置此图像的排序时间。
     */
    fun getOrganizationSituation(illustIds: List<Int>, onlyNeighbours: Boolean = false, gatherGroup: Boolean = false, resortInGroup: Boolean = false, resortAtAll: Boolean = false): List<List<OrganizationSituationRes>> {
        data class Row(val id: Int, val filePath: FilePath, val fingerprint: Fingerprint, val sourceDataPath: SourceDataPath?, val orderTime: Long, var newOrderTime: Long? = null)

        val illusts = data.db.from(Illusts)
            .innerJoin(FileFingerprints, FileFingerprints.fileId eq Illusts.fileId)
            .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
            .select(Illusts.id, Illusts.orderTime, Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, Illusts.sourcePartName,
                FileRecords.id, FileRecords.status, FileRecords.extension, FileRecords.block,
                FileFingerprints.dHash, FileFingerprints.pHash, FileFingerprints.pHashSimple, FileFingerprints.dHashSimple)
            .where { Illusts.id inList illustIds }
            .orderBy(Illusts.orderTime.asc())
            .map {
                val filePath = filePathFrom(it)
                val s = sourcePathOf(it)
                val f = Fingerprint(it[FileFingerprints.pHashSimple]!!, it[FileFingerprints.dHashSimple]!!, it[FileFingerprints.pHash]!!, it[FileFingerprints.dHash]!!)
                Row(it[Illusts.id]!!, filePath, f, s, it[Illusts.orderTime]!!)
            }
            .letIf(resortAtAll) {
                it.sortedWith { a, b ->
                    if(a.sourceDataPath != null && b.sourceDataPath != null) sourcePathComparator.compare(a.sourceDataPath, b.sourceDataPath)
                    else if(a.sourceDataPath == null && b.sourceDataPath == null) 0
                    else if(a.sourceDataPath == null) 1
                    else -1
                }
            }

        val groups = mutableListOf<MutableList<Row>>()
        if(onlyNeighbours) {
            for (illust in illusts) {
                if(groups.isEmpty() || Similarity.matchSimilarity(groups.last().last().fingerprint, illust.fingerprint) <= 0) {
                    groups.add(mutableListOf(illust))
                }else{
                    groups.last().add(illust)
                }
            }
        }else{
            val flag = illusts.indices.map { true }.toMutableList()
            for(i in illusts.indices) {
                if(flag[i]) {
                    flag[i] = false
                    val illust = illusts[i]
                    val group = mutableListOf(illust)
                    for(j in (i + 1) until illusts.size) {
                        if(flag[j] && Similarity.matchSimilarity(illust.fingerprint, illusts[j].fingerprint) > 0) {
                            flag[j] = false
                            group.add(illusts[j])
                        }
                    }
                    groups.add(group)
                }
            }
        }

        val sortedGroups = groups.letIf(resortInGroup && !resortAtAll) {
            it.map { group ->
                group.sortedWith { a, b ->
                    if(a.sourceDataPath != null && b.sourceDataPath != null) sourcePathComparator.compare(a.sourceDataPath, b.sourceDataPath)
                    else if(a.sourceDataPath == null && b.sourceDataPath == null) 0
                    else if(a.sourceDataPath == null) 1
                    else -1
                }.toMutableList()
            }.toMutableList()
        }

        if(gatherGroup && !onlyNeighbours) {
            val orderTimeSeq = illusts.map { it.orderTime }.sorted().iterator()
            for (group in sortedGroups) {
                for (illust in group) {
                    val ot = orderTimeSeq.next()
                    if(illust.orderTime != ot) {
                        illust.newOrderTime = ot
                    }
                }
            }
        }else{
            for (group in sortedGroups) {
                val orderTimeSeq = group.map { it.orderTime }.sorted()
                for ((illust, ot) in group.zip(orderTimeSeq)) {
                    if(illust.orderTime != ot) {
                        illust.newOrderTime = ot
                    }
                }
            }
        }

        return sortedGroups.map { group -> group.map { OrganizationSituationRes(it.id, it.filePath, it.orderTime.toInstant(), it.newOrderTime?.toInstant()) } }
    }

    /**
     * 应用一组智能整理。
     */
    fun applyOrganizationSituation(form: OrganizationSituationApplyForm) {
        data.db.transaction {
            //首先提取所有newOrderTime，按照旧orderTime排序后提交batch update
            val newOrderTimeMap = form.groups.flatten().filter { it.newOrderTime != null }.associate { it.id to it.newOrderTime!! }
            val (newOrderTimeIds, newOrderTimeList) = data.db.from(Illusts)
                .select(Illusts.id, Illusts.orderTime)
                .where { Illusts.id inList newOrderTimeMap.keys }
                .orderBy(Illusts.orderTime.asc())
                .map { Pair(it[Illusts.id]!!, newOrderTimeMap[it[Illusts.id]]!!) }
                .unzip()
            illustManager.bulkUpdate(IllustBatchUpdateForm(target = newOrderTimeIds, orderTimeList = optOf(newOrderTimeList)))
            //然后按照组，对于每个size>1的组，为其创建新集合
            for (group in form.groups) {
                if(group.size > 1) {
                    val illustIds = group.map { it.id }
                    val specifyPartitionTime = if(appdata.setting.meta.centralizeCollection) {
                        //在开启此选项时，需要计算新的partitionTime。若同组的所有illust都在同一个partitionTime下，则不需要此参数；否则，选择数量最多的一个partitionTime
                        val illusts = data.db.from(Illusts)
                            .select(Illusts.id, Illusts.orderTime, Illusts.partitionTime)
                            .where { Illusts.id inList illustIds }
                            .map { Triple(it[Illusts.id]!!, it[Illusts.orderTime]!!, it[Illusts.partitionTime]!!) }
                        val count = illusts.map { (_, _, pt) -> pt }.duplicateCount()
                        if(count.size > 1) {
                            count.entries.maxBy { it.value }.key
                        }else{
                            null
                        }
                    }else null
                    illustManager.newCollection(illustIds, "", null, null, Illust.Tagme.EMPTY, specifyPartitionTime)
                }
            }
        }
    }

    /**
     * getFolderSituation|getBookSituation的公共代码部分。
     */
    private fun getBookOrFolderSituationCommons(illustIds: List<Int>): List<Pair<Int, FilePath>> {
        data class Row(val id: Int, val type: IllustModelType, val filePath: FilePath)
        data class ChildrenRow(val id: Int, val filePath: FilePath)
        //先根据id列表把所有的illust查询出来, 然后从中分离collection和image
        val (collectionRows, imageRows) = data.db.from(Illusts)
            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
            .select(Illusts.id, Illusts.type, Illusts.parentId, Illusts.orderTime, Illusts.cachedChildrenCount, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { Illusts.id inList illustIds }
            .map { row ->
                val filePath = filePathFrom(row)
                Row(row[Illusts.id]!!, row[Illusts.type]!!, filePath)
            }
            .filterInto { it.type == IllustModelType.COLLECTION }

        //对于collection，查询下属的所有children
        val childrenRows = data.db.from(Illusts)
            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
            .select(Illusts.id, Illusts.parentId, Illusts.orderTime, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { (Illusts.parentId inList collectionRows.map { it.id }) and (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT) }
            .map { row ->
                val filePath = filePathFrom(row)
                ChildrenRow(row[Illusts.id]!!, filePath)
            }

        //将childrenRows和imageRows组合编排成结果集
        val childrenResult = childrenRows.asSequence().map { Pair(it.id, it.filePath) }
        val imageResult = imageRows.asSequence().map { Pair(it.id, it.filePath) }
        return (childrenResult + imageResult).distinctBy { it.first }.toList()
    }
}