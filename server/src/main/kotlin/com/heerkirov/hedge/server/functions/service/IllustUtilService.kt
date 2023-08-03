package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.utils.DateTime.parseDateTime
import com.heerkirov.hedge.server.utils.business.filePathFrom
import com.heerkirov.hedge.server.utils.filterInto
import com.heerkirov.hedge.server.utils.letIf
import org.ktorm.dsl.*
import org.ktorm.entity.filter
import org.ktorm.entity.sequenceOf
import org.ktorm.entity.toList
import java.time.LocalDateTime

class IllustUtilService(private val data: DataRepository) {
    /**
     * 查询一组illust的collection所属情况，列出这些illust已经属于的所有collection。
     * 这个工具API一般用于创建collection前，对内容列表校验，以提示用户如何创建collection。
     */
    fun getCollectionSituation(illustIds: List<Int>, exampleCount: Int = 5): List<CollectionSituationRes> {
        //查询所有的illust，不过IMAGE类型不包括在其中，它们跟collection没什么关系
        val (collectionResult, imageResult) = data.db.sequenceOf(Illusts)
            .filter { (it.id inList illustIds) and (it.type notEq IllustModelType.IMAGE) }
            .asKotlinSequence()
            .filterInto { it.type == IllustModelType.COLLECTION }

        //处理images。查询它们所属的collection
        val collectionResultIds = collectionResult.asSequence().map { it.id }.toSet()
        val imageResultParentIds = imageResult.asSequence().map { it.parentId!! }.filter { it !in collectionResultIds }.toSet()
        val imageParentResult = data.db.sequenceOf(Illusts).filter { (it.id inList imageResultParentIds) and (it.type eq IllustModelType.COLLECTION) }.toList()

        return (collectionResult.asSequence() + imageParentResult.asSequence())
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

                val belongs = imageResult
                    .filter { image -> image.parentId == it.id }
                    .map { image -> image.id }
                    .letIf(it.id in collectionResultIds) { l -> l + it.id }

                CollectionSituationRes(it.id, it.cachedChildrenCount, it.orderTime.parseDateTime(), examples, belongs)
            }.toList()
    }

    /**
     * 查询一组illust中，所有的image和collection下属的image。同时，列出每个image的所属集合。
     * 这个工具API一般用于拖放illusts后，对内容列表做整体解析。
     */
    fun getImageSituation(illustIds: List<Int>): List<ImageSituationRes> {
        data class Row(val id: Int, val type: IllustModelType, val parentId: Int?, val childrenCount: Int?, val orderTime: LocalDateTime, val filePath: FilePath)
        data class ChildrenRow(val id: Int, val parentId: Int, val orderTime: LocalDateTime, val filePath: FilePath)
        //先根据id列表把所有的illust查询出来, 然后从中分离collection, image, image_with_parent
        val rows = data.db.from(Illusts)
            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
            .select(Illusts.id, Illusts.type, Illusts.parentId, Illusts.orderTime, Illusts.cachedChildrenCount, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { Illusts.id inList illustIds }
            .map { row ->
                val filePath = filePathFrom(row)
                Row(row[Illusts.id]!!, row[Illusts.type]!!, row[Illusts.parentId], row[Illusts.cachedChildrenCount], row[Illusts.orderTime]!!.parseDateTime(), filePath)
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
                ChildrenRow(row[Illusts.id]!!, row[Illusts.parentId]!!, row[Illusts.orderTime]!!.parseDateTime(), filePath)
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