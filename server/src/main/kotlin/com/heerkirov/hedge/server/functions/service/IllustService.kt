package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.filter.*
import com.heerkirov.hedge.server.dto.form.*
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.*
import com.heerkirov.hedge.server.events.IllustImagesChanged
import com.heerkirov.hedge.server.events.IllustRelatedItemsUpdated
import com.heerkirov.hedge.server.events.IllustUpdated
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.kit.IllustKit
import com.heerkirov.hedge.server.functions.manager.AssociateManager
import com.heerkirov.hedge.server.functions.manager.IllustManager
import com.heerkirov.hedge.server.functions.manager.SourceDataManager
import com.heerkirov.hedge.server.functions.manager.SourceSiteManager
import com.heerkirov.hedge.server.functions.manager.query.QueryManager
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.utils.DateTime.toInstant
import com.heerkirov.hedge.server.utils.DateTime.toPartitionDate
import com.heerkirov.hedge.server.utils.business.filePathFrom
import com.heerkirov.hedge.server.utils.business.sourcePathOf
import com.heerkirov.hedge.server.utils.business.toListResult
import com.heerkirov.hedge.server.utils.ktorm.*
import com.heerkirov.hedge.server.utils.mostCount
import com.heerkirov.hedge.server.utils.runIf
import com.heerkirov.hedge.server.utils.types.Opt
import com.heerkirov.hedge.server.utils.types.anyOpt
import com.heerkirov.hedge.server.utils.types.descendingOrderItem
import com.heerkirov.hedge.server.utils.types.undefined
import org.ktorm.dsl.*
import org.ktorm.entity.filter
import org.ktorm.entity.first
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import org.ktorm.expression.BinaryExpression
import org.ktorm.expression.SelectExpression
import org.ktorm.support.sqlite.iif
import java.time.Instant
import kotlin.math.roundToInt

class IllustService(private val appdata: AppDataManager,
                    private val data: DataRepository,
                    private val bus: EventBus,
                    private val kit: IllustKit,
                    private val illustManager: IllustManager,
                    private val associateManager: AssociateManager,
                    private val sourceSiteManager: SourceSiteManager,
                    private val sourceManager: SourceDataManager,
                    private val queryManager: QueryManager) {
    private val orderTranslator = OrderTranslator {
        "id" to Illusts.id
        "createTime" to Illusts.createTime
        "updateTime" to Illusts.updateTime
        "orderTime" to Illusts.orderTime
        "score" to Illusts.exportedScore nulls last
    }

    fun list(filter: IllustQueryFilter): ListResult<IllustRes> {
        val schema = if(filter.query.isNullOrBlank()) null else {
            queryManager.querySchema(filter.query, QueryManager.Dialect.ILLUST).executePlan ?: return ListResult(0, emptyList())
        }
        return data.db.from(Illusts)
            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
            .let { schema?.joinConditions?.fold(it) { acc, join -> if(join.left) acc.leftJoin(join.table, join.condition) else acc.innerJoin(join.table, join.condition) } ?: it }
            .let { if(filter.topic == null) it else it.innerJoin(IllustTopicRelations, (IllustTopicRelations.illustId eq Illusts.id) and (IllustTopicRelations.topicId eq filter.topic)) }
            .let { if(filter.author == null) it else it.innerJoin(IllustAuthorRelations, (IllustAuthorRelations.illustId eq Illusts.id) and (IllustAuthorRelations.authorId eq filter.author)) }
            .select(Illusts.id, Illusts.type, Illusts.exportedScore, Illusts.favorite, Illusts.tagme, Illusts.partitionTime, Illusts.orderTime, Illusts.cachedChildrenCount,
                Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, Illusts.sourcePartName,
                FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .whereWithConditions {
                it += when(filter.type) {
                    IllustQueryType.COLLECTION -> (Illusts.type eq IllustModelType.COLLECTION) or (Illusts.type eq IllustModelType.IMAGE)
                    IllustQueryType.IMAGE -> (Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)
                    IllustQueryType.ONLY_COLLECTION -> Illusts.type eq IllustModelType.COLLECTION
                    IllustQueryType.ONLY_IMAGE -> Illusts.type eq IllustModelType.IMAGE
                }
                if(filter.partition != null) {
                    it += Illusts.partitionTime eq filter.partition
                }
                if(filter.favorite != null) {
                    it += if(filter.favorite) Illusts.favorite else Illusts.favorite.not()
                }
                if(schema != null && schema.whereConditions.isNotEmpty()) {
                    it.addAll(schema.whereConditions)
                }
            }
            .runIf(schema?.distinct == true) { groupBy(Illusts.id) }
            .limit(filter.offset, filter.limit)
            .orderBy(orderTranslator, filter.order, schema?.orderConditions, default = descendingOrderItem("orderTime"))
            .toListResult(::newIllustRes)
    }

    fun listPartitions(filter: PartitionFilter): List<PartitionRes> {
        val schema = if(filter.query.isNullOrBlank()) null else {
            queryManager.querySchema(filter.query, QueryManager.Dialect.ILLUST).executePlan ?: return emptyList()
        }

        return data.db.from(Illusts)
            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
            .let { schema?.joinConditions?.fold(it) { acc, join -> if(join.left) acc.leftJoin(join.table, join.condition) else acc.innerJoin(join.table, join.condition) } ?: it }
            .select(Illusts.partitionTime, countDistinct(Illusts.id).aliased("count"))
            .whereWithConditions {
                it += when(filter.type) {
                    IllustQueryType.COLLECTION -> (Illusts.type eq IllustModelType.COLLECTION) or (Illusts.type eq IllustModelType.IMAGE)
                    IllustQueryType.IMAGE -> (Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)
                    IllustQueryType.ONLY_COLLECTION -> Illusts.type eq IllustModelType.COLLECTION
                    IllustQueryType.ONLY_IMAGE -> Illusts.type eq IllustModelType.IMAGE
                }
                if(filter.gte != null) it += Illusts.partitionTime greaterEq filter.gte
                if(filter.lt != null) it += Illusts.partitionTime less filter.lt
                if(schema != null && schema.whereConditions.isNotEmpty()) {
                    it.addAll(schema.whereConditions)
                }
            }
            .groupBy(Illusts.partitionTime)
            .orderBy(Illusts.partitionTime.asc())
            .map { PartitionRes(it[Illusts.partitionTime]!!, it.getInt("count")) }
    }

    fun findByIds(imageIds: List<Int>): List<IllustRes?> {
        return data.db.from(Illusts)
            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
            .select(Illusts.id, Illusts.type, Illusts.exportedScore, Illusts.favorite, Illusts.tagme, Illusts.partitionTime, Illusts.orderTime, Illusts.cachedChildrenCount,
                Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, Illusts.sourcePartName,
                FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { Illusts.id inList imageIds }
            .map { it[Illusts.id]!! to newIllustRes(it) }
            .toMap()
            .let { r -> imageIds.map { r[it] } }
    }

    fun summaryByIds(form: IllustSummaryForm): IllustSummaryRes {
        val authorColors = appdata.setting.meta.authorColors
        val topicColors = appdata.setting.meta.topicColors

        val allRows = if(form.unfold) {
            illustManager.unfoldImages(form.illustIds, "illustIds").map { Triple(it.id, it.description, it.tagme) }
        }else{
            data.db.from(Illusts)
                .select(Illusts.id, Illusts.description, Illusts.tagme)
                .where { Illusts.id inList form.illustIds }
                .map { Triple(it[Illusts.id]!!, it[Illusts.description]!!, it[Illusts.tagme]!!) }
                .ifEmpty { throw be(ResourceNotExist("images", form.illustIds)) }
        }
        val illustIds = if(form.unfold) allRows.map { (id, _, _) -> id } else form.illustIds

        val aggregatedRow = data.db.from(Illusts)
            .select(
                (count(Illusts.favorite eq true) greater 0).aliased("favorite"),
                min(Illusts.score).aliased("scoreMin"), max(Illusts.score).aliased("scoreMax"), avg(Illusts.score).aliased("scoreAvg"),
                min(Illusts.orderTime).aliased("orderTimeMin"), max(Illusts.orderTime).aliased("orderTimeMax"))
            .where { Illusts.id inList illustIds }
            .first()

        val topics = data.db.from(Topics)
            .innerJoin(IllustTopicRelations, IllustTopicRelations.topicId eq Topics.id)
            .select(Topics.id, Topics.name, Topics.type, Topics.parentId, (sum(iif(IllustTopicRelations.isExported notEq ExportType.NO, 0, 1)) lessEq 0).aliased("isExported"))
            .where { IllustTopicRelations.illustId inList illustIds }
            .groupBy(Topics.id)
            .orderBy(Topics.type.asc(), Topics.id.asc())
            .toTopicSimpleList(topicColors)

        val authors = data.db.from(Authors)
            .innerJoin(IllustAuthorRelations, IllustAuthorRelations.authorId eq Authors.id)
            .select(Authors.id, Authors.name, Authors.type, (sum(iif(IllustAuthorRelations.isExported notEq ExportType.NO, 0, 1)) lessEq 0).aliased("isExported"))
            .where { IllustAuthorRelations.illustId inList illustIds }
            .groupBy(Authors.id)
            .orderBy(Authors.type.desc(), Authors.id.asc())
            .toAuthorSimpleList(authorColors)

        val tags = data.db.from(Tags)
            .innerJoin(IllustTagRelations, IllustTagRelations.tagId eq Tags.id)
            .select(Tags.id, Tags.name, Tags.color, Tags.parentId, Tags.isOverrideGroup, (sum(iif(IllustTagRelations.isExported notEq ExportType.NO, 0, 1)) lessEq 0).aliased("isExported"))
            .where { (IllustTagRelations.illustId inList illustIds) and (Tags.type eq TagAddressType.TAG) }
            .groupBy(Tags.id)
            .orderBy(Tags.globalOrdinal.asc())
            .toTagSimpleList()

        val description = allRows.map { (_, d, _) -> d }.mostCount()
        val tagme = allRows.map { (_, _, t) -> t }.reduce { a, b -> a + b }
        val favorite = aggregatedRow.getBoolean("favorite")
        val scoreMin = aggregatedRow.getInt("scoreMin")
        val scoreMax = aggregatedRow.getInt("scoreMax")
        val scoreAvg = aggregatedRow.getInt("scoreAvg")
        val orderTimeMin = aggregatedRow.getInstant("orderTimeMin")!!
        val orderTimeMax = aggregatedRow.getInstant("orderTimeMax")!!

        return IllustSummaryRes(allRows.map { (id, _, _) -> id }, topics, authors, tags, description, favorite, tagme, scoreMin, scoreMax, scoreAvg, orderTimeMin, orderTimeMax)
    }

    fun findImageLocation(filter: IllustLocationFilter): IllustLocationRes {
        val imageId: Int
        val finalType: IllustType

        if(filter.type === IllustQueryType.IMAGE) {
            imageId = filter.imageId
            finalType = IllustType.IMAGE
        }else{
            val parentId = data.db.from(Illusts).select(Illusts.parentId).where { Illusts.id eq filter.imageId }.firstOrNull()?.get(Illusts.parentId)
            if(filter.type === IllustQueryType.COLLECTION) {
                //在COLLECTION模式下，如果image是集合成员，就应该转而搜索它的父集合
                if(parentId != null) {
                    imageId = parentId
                    finalType = IllustType.COLLECTION
                }else{
                    imageId = filter.imageId
                    finalType = IllustType.IMAGE
                }
            }else if(filter.type === IllustQueryType.ONLY_IMAGE) {
                //在ONLY_IMAGE模式下，如果image是集合成员，那么是没有搜索结果的
                if(parentId == null) {
                    imageId = filter.imageId
                    finalType = IllustType.IMAGE
                }else{
                    return IllustLocationRes(parentId, -1, IllustType.COLLECTION)
                }
            }else{
                //在ONLY_COLLECTION模式下，如果image不是集合成员，那么是没有搜索结果的
                if(parentId != null) {
                    imageId = parentId
                    finalType = IllustType.COLLECTION
                }else{
                    return IllustLocationRes(filter.imageId, -1, IllustType.IMAGE)
                }
            }
        }

        val schema = if(filter.query.isNullOrBlank()) null else {
            queryManager.querySchema(filter.query, QueryManager.Dialect.ILLUST).executePlan ?: return IllustLocationRes(imageId, -2, finalType)
        }

        val orderByExpressions = orderTranslator.toOrderByExpressions(filter.order, schema?.orderConditions, default = descendingOrderItem("orderTime"))

        val query = data.db.from(Illusts)
            .let { schema?.joinConditions?.fold(it) { acc, join -> if(join.left) acc.leftJoin(join.table, join.condition) else acc.innerJoin(join.table, join.condition) } ?: it }
            .let { if(filter.topic == null) it else it.innerJoin(IllustTopicRelations, (IllustTopicRelations.illustId eq Illusts.id) and (IllustTopicRelations.topicId eq filter.topic)) }
            .let { if(filter.author == null) it else it.innerJoin(IllustAuthorRelations, (IllustAuthorRelations.illustId eq Illusts.id) and (IllustAuthorRelations.authorId eq filter.author)) }
            .select(Illusts.id.aliased("id"), rowNumber(*orderByExpressions).aliased("idx"))
            .whereWithConditions {
                it += when(filter.type) {
                    IllustQueryType.COLLECTION -> (Illusts.type eq IllustModelType.COLLECTION) or (Illusts.type eq IllustModelType.IMAGE)
                    IllustQueryType.IMAGE -> (Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)
                    IllustQueryType.ONLY_COLLECTION -> Illusts.type eq IllustModelType.COLLECTION
                    IllustQueryType.ONLY_IMAGE -> Illusts.type eq IllustModelType.IMAGE
                }
                if(filter.partition != null) {
                    it += Illusts.partitionTime eq filter.partition
                }
                if(filter.favorite != null) {
                    it += if(filter.favorite) Illusts.favorite else Illusts.favorite.not()
                }
                if(schema != null && schema.whereConditions.isNotEmpty()) {
                    it.addAll(schema.whereConditions)
                }
            }
            .runIf(schema?.distinct == true) { groupBy(Illusts.id) }

        val selectExpression = SelectExpression(from = query.expression, where = Illusts.id.aliased("id") eq imageId, limit = 1)
        val row = data.db.executeQuery(selectExpression)
        val index = if(row.next()) row.getInt("idx") else -1
        return IllustLocationRes(imageId, index, finalType)
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun get(id: Int, type: IllustType? = null): IllustDetailRes {
        val row = data.db.from(Illusts)
            .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
            .select(
                FileRecords.id, FileRecords.block, FileRecords.status, FileRecords.extension, FileRecords.size,
                FileRecords.resolutionWidth, FileRecords.resolutionHeight, FileRecords.videoDuration, FileRecords.originFilename,
                Illusts.type, Illusts.parentId, Illusts.description, Illusts.score,
                Illusts.cachedChildrenCount, Illusts.cachedBookIds, Illusts.cachedFolderIds,
                Illusts.exportedDescription, Illusts.exportedScore, Illusts.favorite, Illusts.tagme,
                Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, Illusts.sourcePartName,
                Illusts.partitionTime, Illusts.orderTime, Illusts.createTime, Illusts.updateTime)
            .where { retrieveCondition(id, type) }
            .firstOrNull()
            ?: throw be(NotFound())

        val filePath = filePathFrom(row)
        val fileName = row[FileRecords.originFilename]!!
        val extension = row[FileRecords.extension]!!
        val size = row[FileRecords.size]!!
        val resolutionWidth = row[FileRecords.resolutionWidth]!!
        val resolutionHeight = row[FileRecords.resolutionHeight]!!
        val videoDuration = row[FileRecords.videoDuration]!!

        val finalType = type ?: if(row[Illusts.type]!! == IllustModelType.COLLECTION) IllustType.COLLECTION else IllustType.IMAGE
        val parentId = if(finalType == IllustType.IMAGE) row[Illusts.parentId] else null
        val childrenCount = row[Illusts.cachedChildrenCount]!!.takeIf { finalType == IllustType.COLLECTION }
        val originDescription = row[Illusts.description]!!
        val originScore = row[Illusts.score]
        val description = row[Illusts.exportedDescription]!!
        val score = row[Illusts.exportedScore]
        val favorite = row[Illusts.favorite]!!
        val tagme = row[Illusts.tagme]!!
        val partitionTime = row[Illusts.partitionTime]!!
        val orderTime = row[Illusts.orderTime]!!.toInstant()
        val createTime = row[Illusts.createTime]!!
        val updateTime = row[Illusts.updateTime]!!
        val source = sourcePathOf(row)

        val authorColors = appdata.setting.meta.authorColors
        val topicColors = appdata.setting.meta.topicColors

        val topics = data.db.from(Topics)
            .innerJoin(IllustTopicRelations, IllustTopicRelations.topicId eq Topics.id)
            .select(Topics.id, Topics.name, Topics.type, Topics.parentId, IllustTopicRelations.isExported)
            .where { IllustTopicRelations.illustId eq id }
            .orderBy(Topics.type.asc(), Topics.id.asc())
            .toTopicSimpleList(topicColors, isExportedColumn = IllustTopicRelations.isExported)

        val authors = data.db.from(Authors)
            .innerJoin(IllustAuthorRelations, IllustAuthorRelations.authorId eq Authors.id)
            .select(Authors.id, Authors.name, Authors.type, IllustAuthorRelations.isExported)
            .where { IllustAuthorRelations.illustId eq id }
            .orderBy(Authors.type.desc(), Authors.id.asc())
            .toAuthorSimpleList(authorColors, isExportedColumn = IllustAuthorRelations.isExported)

        val tags = data.db.from(Tags)
            .innerJoin(IllustTagRelations, IllustTagRelations.tagId eq Tags.id)
            .select(Tags.id, Tags.name, Tags.color, Tags.parentId, Tags.isOverrideGroup, IllustTagRelations.isExported)
            .where { (IllustTagRelations.illustId eq id) and (Tags.type eq TagAddressType.TAG) }
            .orderBy(Tags.globalOrdinal.asc())
            .toTagSimpleList(isExportedColumn = IllustTagRelations.isExported)

        val parent = if(parentId == null) null else data.db.from(Illusts)
            .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
            .select(Illusts.id, Illusts.cachedChildrenCount, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { Illusts.id eq parentId }
            .firstOrNull()
            ?.let { IllustParent(it[Illusts.id]!!, filePathFrom(it), it[Illusts.cachedChildrenCount]!!) }

        val children = if(finalType == IllustType.IMAGE) null else data.db.from(Illusts)
            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
            .select(Illusts.id, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { (Illusts.parentId eq id) and (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT) }
            .limit(9)
            .orderBy(Illusts.orderTime.asc())
            .map { IllustSimpleRes(it[Illusts.id]!!, filePathFrom(it)) }

        val books = if(finalType == IllustType.IMAGE) {
            data.db.from(Books)
                .innerJoin(BookImageRelations, BookImageRelations.bookId eq Books.id)
                .leftJoin(FileRecords, Books.fileId eq FileRecords.id)
                .select(Books.id, Books.title, FileRecords.id, FileRecords.status, FileRecords.block, FileRecords.extension)
                .where { BookImageRelations.imageId eq id }
                .map { BookSimpleRes(it[Books.id]!!, it[Books.title]!!, if(it[FileRecords.id] != null) filePathFrom(it) else null) }
        }else{
            row[Illusts.cachedBookIds]?.let {
                data.db.from(Books)
                    .leftJoin(FileRecords, Books.fileId eq FileRecords.id)
                    .select(Books.id, Books.title, FileRecords.id, FileRecords.status, FileRecords.block, FileRecords.extension)
                    .where { Books.id inList it }
                    .map { BookSimpleRes(it[Books.id]!!, it[Books.title]!!, if(it[FileRecords.id] != null) filePathFrom(it) else null) }
            } ?: emptyList()
        }

        val folders = if(finalType == IllustType.IMAGE) {
            data.db.from(Folders)
                .innerJoin(FolderImageRelations, FolderImageRelations.folderId eq Folders.id)
                .select(Folders.id, Folders.title, Folders.parentAddress, Folders.type)
                .where { FolderImageRelations.imageId eq id }
                .map { FolderSimpleRes(it[Folders.id]!!, (it[Folders.parentAddress] ?: emptyList()) + it[Folders.title]!!, it[Folders.type]!!) }
        }else{
            row[Illusts.cachedFolderIds]?.let {
                data.db.from(Folders)
                    .select(Folders.id, Folders.title, Folders.parentAddress, Folders.type)
                    .where { Folders.id inList it }
                    .map { FolderSimpleRes(it[Folders.id]!!, (it[Folders.parentAddress] ?: emptyList()) + it[Folders.title]!!, it[Folders.type]!!) }
            } ?: emptyList()
        }

        val associateCount = associateManager.getAssociateCountOfIllust(id)

        return IllustDetailRes(
            id, finalType, childrenCount, filePath, fileName,
            extension, size, resolutionWidth, resolutionHeight, videoDuration,
            topics, authors, tags,
            description, score, favorite, tagme,
            originDescription, originScore, source,
            parent, children, books, folders, associateCount,
            partitionTime, orderTime, createTime, updateTime
        )
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun getSimple(id: Int): IllustRes {
        val row = data.db.from(Illusts)
            .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
            .select(
                Illusts.id, Illusts.type, Illusts.exportedScore, Illusts.favorite, Illusts.tagme, Illusts.partitionTime, Illusts.orderTime, Illusts.cachedChildrenCount,
                Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, Illusts.sourcePartName,
                FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { Illusts.id eq id }
            .firstOrNull()
            ?: throw be(NotFound())

        return newIllustRes(row)
    }

    /**
     * @throws NotFound 请求对象不存在
     * @throws ResourceNotExist ("topics", number[]) 部分topics资源不存在。给出不存在的topic id列表
     * @throws ResourceNotExist ("authors", number[]) 部分authors资源不存在。给出不存在的author id列表
     * @throws ResourceNotExist ("tags", number[]) 部分tags资源不存在。给出不存在的tag id列表
     * @throws ResourceNotSuitable ("tags", number[]) 部分tags资源不适用。地址段不适用于此项。给出不适用的tag id列表
     * @throws ConflictingGroupMembersError 发现标签冲突组
     */
    fun update(id: Int, form: IllustUpdateForm) {
        val illust = data.db.sequenceOf(Illusts).firstOrNull { Illusts.id eq id } ?: throw be(NotFound())
        if(illust.type == IllustModelType.COLLECTION) {
            updateCollection(id, form, illust)
        }else{
            updateImage(id, form, illust)
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun getCollectionRelatedItems(id: Int): IllustCollectionRelatedRes {
        val row = data.db.from(Illusts)
            .select(Illusts.cachedBookIds, Illusts.cachedFolderIds, Illusts.cachedChildrenCount)
            .where { retrieveCondition(id, IllustType.COLLECTION) }
            .firstOrNull()
            ?: throw be(NotFound())

        val children = data.db.from(Illusts)
            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
            .select(Illusts.id, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { (Illusts.parentId eq id) and (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT) }
            .limit(9)
            .orderBy(Illusts.orderTime.asc())
            .map { IllustSimpleRes(it[Illusts.id]!!, filePathFrom(it)) }

        val childrenCount = row[Illusts.cachedChildrenCount]!!
        
        val associates = associateManager.getAssociatesOfIllust(id)

        val books = row[Illusts.cachedBookIds]?.let {
            data.db.from(Books)
                .leftJoin(FileRecords, Books.fileId eq FileRecords.id)
                .select(Books.id, Books.title, FileRecords.id, FileRecords.status, FileRecords.block, FileRecords.extension)
                .where { Books.id inList it }
                .map { BookSimpleRes(it[Books.id]!!, it[Books.title]!!, if(it[FileRecords.id] != null) filePathFrom(it) else null) }
        } ?: emptyList()

        val folders = row[Illusts.cachedFolderIds]?.let {
            data.db.from(Folders)
                .select(Folders.id, Folders.title, Folders.parentAddress, Folders.type)
                .where { Folders.id inList it }
                .map { FolderSimpleRes(it[Folders.id]!!, (it[Folders.parentAddress] ?: emptyList()) + it[Folders.title]!!, it[Folders.type]!!) }
        } ?: emptyList()

        return IllustCollectionRelatedRes(children, childrenCount, associates, books, folders)
    }

    fun getCollectionImages(id: Int, filter: LimitAndOffsetFilter): ListResult<IllustRes> {
        return data.db.from(Illusts)
            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
            .select(Illusts.id, Illusts.type, Illusts.exportedScore, Illusts.favorite, Illusts.tagme, Illusts.partitionTime, Illusts.orderTime,
                Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, Illusts.sourcePartName,
                FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { (Illusts.parentId eq id) and (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT) }
            .limit(filter.offset, filter.limit)
            .orderBy(Illusts.orderTime.asc())
            .toListResult(::newIllustRes)
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun getImageRelatedItems(id: Int): IllustImageRelatedRes {
        val row = data.db.from(Illusts)
            .select(Illusts.parentId)
            .where { retrieveCondition(id, IllustType.IMAGE) }
            .firstOrNull()
            ?: throw be(NotFound())
        val parentId = row[Illusts.parentId]

        val parent = if(parentId == null) null else data.db.from(Illusts)
            .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
            .select(Illusts.id, Illusts.cachedChildrenCount, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { Illusts.id eq parentId }
            .firstOrNull()
            ?.let { IllustParent(it[Illusts.id]!!, filePathFrom(it), it[Illusts.cachedChildrenCount]!!) }

        val books = data.db.from(Books)
            .innerJoin(BookImageRelations, BookImageRelations.bookId eq Books.id)
            .leftJoin(FileRecords, Books.fileId eq FileRecords.id)
            .select(Books.id, Books.title, FileRecords.id, FileRecords.status, FileRecords.block, FileRecords.extension)
            .where { BookImageRelations.imageId eq id }
            .map { BookSimpleRes(it[Books.id]!!, it[Books.title]!!, if(it[FileRecords.id] != null) filePathFrom(it) else null) }

        val folders = data.db.from(Folders)
            .innerJoin(FolderImageRelations, FolderImageRelations.folderId eq Folders.id)
            .select(Folders.id, Folders.title, Folders.parentAddress, Folders.type)
            .where { FolderImageRelations.imageId eq id }
            .map { FolderSimpleRes(it[Folders.id]!!, (it[Folders.parentAddress] ?: emptyList()) + it[Folders.title]!!, it[Folders.type]!!) }

        val associates = associateManager.getAssociatesOfIllust(id)

        return IllustImageRelatedRes(parent, books, folders, associates)
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun getImageSourceData(id: Int): IllustImageSourceDataRes {
        val row = data.db.from(Illusts)
            .select(Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, Illusts.sourcePartName)
            .where { retrieveCondition(id, IllustType.IMAGE) }
            .firstOrNull()
            ?: throw be(NotFound())

        val source = sourcePathOf(row)
        return if(source != null) {
            val site = sourceSiteManager.get(source.sourceSite)
            val sourceRow = data.db.from(SourceDatas).select()
                .where { (SourceDatas.sourceSite eq source.sourceSite) and (SourceDatas.sourceId eq source.sourceId) }
                .firstOrNull()
            if(sourceRow != null) {
                val sourceRowId = sourceRow[SourceDatas.id]!!
                val sourceTags = data.db.from(SourceTags)
                    .innerJoin(SourceTagRelations, (SourceTags.id eq SourceTagRelations.sourceTagId) and (SourceTagRelations.sourceDataId eq sourceRowId))
                    .select()
                    .map { SourceTags.createEntity(it) }
                    .map { SourceTagDto(it.code, it.type, it.name, it.otherName) }
                val sourcePools = data.db.from(SourceBooks)
                    .innerJoin(SourceBookRelations, (SourceBooks.id eq SourceBookRelations.sourceBookId) and (SourceBookRelations.sourceDataId eq sourceRowId))
                    .select()
                    .map { SourceBooks.createEntity(it) }
                    .map { SourceBookDto(it.code, it.title, it.otherTitle) }
                val additionalInfo = (sourceRow[SourceDatas.additionalInfo] ?: emptyMap()).entries.map { (k, v) ->
                    SourceDataAdditionalInfoDto(k, site?.additionalInfo?.find { it.field == k }?.label ?: "", v)
                }
                val links = if(site != null) sourceManager.generateLinks(site.sourceLinkRules, source.sourceId, sourceTags, additionalInfo) else emptyList()

                IllustImageSourceDataRes(
                    source, site?.title ?: source.sourceSite,
                    sourceRow[SourceDatas.empty]!!, sourceRow[SourceDatas.status]!!,
                    sourceRow[SourceDatas.title] ?: "", sourceRow[SourceDatas.description] ?: "",
                    sourceTags, sourcePools, sourceRow[SourceDatas.relations] ?: emptyList(),
                    links, additionalInfo, sourceRow[SourceDatas.publishTime])
            }else{
                IllustImageSourceDataRes(
                    source, site?.title ?: source.sourceSite,
                    true, SourceEditStatus.NOT_EDITED, "", "", emptyList(), emptyList(), emptyList(), emptyList(), emptyList(), null)
            }
        }else{
            IllustImageSourceDataRes(null, null, true, SourceEditStatus.NOT_EDITED, null, null, null, null, null, null, null, null)
        }
    }

    /**
     * @throws ResourceNotExist ("images", number[]) 给出的部分images不存在。给出不存在的image id列表
     */
    fun createCollection(form: IllustCollectionCreateForm): Int {
        if(form.score != null) kit.validateScore(form.score)
        data.db.transaction {
            return illustManager.newCollection(form.images, form.description ?: "", form.score, form.favorite, form.tagme, form.specifyPartitionTime)
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     * @throws ResourceNotExist ("topics", number[]) 部分topics资源不存在。给出不存在的topic id列表
     * @throws ResourceNotExist ("authors", number[]) 部分authors资源不存在。给出不存在的author id列表
     * @throws ResourceNotExist ("tags", number[]) 部分tags资源不存在。给出不存在的tag id列表
     * @throws ResourceNotSuitable ("tags", number[]) 部分tags资源不适用。地址段不适用于此项。给出不适用的tag id列表
     * @throws ConflictingGroupMembersError 发现标签冲突组
     */
    fun updateCollection(id: Int, form: IllustUpdateForm, preIllust: Illust? = null) {
        data.db.transaction {
            val illust = preIllust ?: data.db.sequenceOf(Illusts).firstOrNull { retrieveCondition(id, IllustType.COLLECTION) } ?: throw be(NotFound())

            form.score.alsoOpt { if(it != null) kit.validateScore(it) }

            val newExportedScore = form.score.letOpt {
                it ?: data.db.from(Illusts)
                    .select(count(Illusts.id).aliased("count"), avg(Illusts.score).aliased("score"))
                    .where { (Illusts.parentId eq id) and (Illusts.score.isNotNull()) }
                    .firstOrNull()?.run {
                        if(getInt("count") > 0) getDouble("score").roundToInt() else null
                    }
            }
            val newPartitionTime = if(form.partitionTime.isPresent) form.partitionTime
                else if(appdata.setting.meta.bindingPartitionWithOrderTime) form.orderTime.letOpt { it.toPartitionDate(appdata.setting.server.timeOffsetHour) }
                else undefined()
            val newDescription = form.description.letOpt { it ?: "" }
            val metaResponse = if(anyOpt(form.tags, form.authors, form.topics)) {
                kit.updateMeta(id, newTags = form.tags, newAuthors = form.authors, newTopics = form.topics, copyFromChildren = true).first
            }else null

            val newTagme = if(form.tagme.isPresent) form.tagme else if(metaResponse != null && metaResponse != Illust.Tagme.EMPTY) Opt(illust.tagme - metaResponse) else undefined()

            if(anyOpt(newTagme, newDescription, form.score, form.favorite, newPartitionTime, form.orderTime)) {
                data.db.update(Illusts) {
                    where { it.id eq id }
                    newTagme.applyOpt { set(it.tagme, this) }
                    newDescription.applyOpt {
                        set(it.description, this)
                        set(it.exportedDescription, this)
                    }
                    form.score.applyOpt { set(it.score, this) }
                    newExportedScore.applyOpt { set(it.exportedScore, this) }
                    form.favorite.applyOpt { set(it.favorite, this) }
                    newPartitionTime.applyOpt { set(it.partitionTime, this) }
                    form.orderTime.applyOpt { set(it.orderTime, this.toEpochMilli()) }
                }
            }

            if(anyOpt(newPartitionTime, form.orderTime, form.favorite, form.tagme)) {
                //这些属性是代理属性，将直接更改其children
                //FUTURE 这里使用的是form.tagme而非newTagme，因此编辑collection的metaTag造成的tagme变更暂且不同步到children，这要等到metaTag的语义也变更后
                data.db.update(Illusts) {
                    where { it.parentId eq id }
                    form.favorite.applyOpt { set(it.favorite, this) }
                    form.tagme.applyOpt { set(it.tagme, this) }
                    newPartitionTime.applyOpt { set(it.partitionTime, this) }
                    form.orderTime.applyOpt { set(it.orderTime, this.toEpochMilli()) }
                }

                val childrenListUpdated = anyOpt(form.orderTime, newPartitionTime, form.favorite, form.tagme)
                if(childrenListUpdated) {
                    val children = data.db.from(Illusts).select(Illusts.id).where { Illusts.parentId eq id }.map { it[Illusts.id]!! }
                    //tips: 此处并没有设置timeSot/favoriteSot，尽管发生了变更。主要是考虑到设置sot会触发一次children->parent的重导出，比较浪费，而实际场景里此处没有刷新事件可能不太有影响
                    bus.emit(children.map { IllustUpdated(it, IllustType.IMAGE, listUpdated = true, detailUpdated = true, timeSot = false, favoriteSot = false, tagmeSot = false) })
                }
            }

            val metaTagSot = anyOpt(form.tags, form.authors, form.topics)
            val listUpdated = anyOpt(form.score, form.favorite, form.orderTime, newTagme)
            val detailUpdated = listUpdated || metaTagSot || newDescription.isPresent || newPartitionTime.isPresent
            if(listUpdated || detailUpdated) {
                bus.emit(IllustUpdated(id, IllustType.COLLECTION, listUpdated = listUpdated, detailUpdated = true, metaTagSot = metaTagSot, scoreSot = form.score.isPresent, descriptionSot = form.description.isPresent))
            }
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     * @throws ResourceNotExist ("associateId", number) 新id指定的associate不存在。给出id
     */
    fun updateCollectionRelatedItems(id: Int, form: IllustCollectionRelatedUpdateForm) {
        data.db.transaction {
            data.db.sequenceOf(Illusts).firstOrNull { retrieveCondition(id, IllustType.COLLECTION) } ?: throw be(NotFound())

            form.associates.alsoOpt { newAssociates ->
                associateManager.setAssociatesOfIllust(id, newAssociates ?: emptyList())

                bus.emit(IllustRelatedItemsUpdated(id, IllustType.COLLECTION, associateSot = true))
            }
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     * @throws ResourceNotExist ("images", number[]) 给出的部分images不存在。给出不存在的image id列表
     */
    fun updateCollectionImages(id: Int, form: IllustCollectionImagesUpdateForm) {
        data.db.transaction {
            val illust = data.db.sequenceOf(Illusts).filter { retrieveCondition(id, IllustType.COLLECTION) }.firstOrNull() ?: throw be(NotFound())

            if(form.illustIds.isEmpty()) throw be(ParamError("images"))
            val images = illustManager.unfoldImages(form.illustIds, sorted = false)

            illustManager.updateImagesInCollection(illust.id, images, form.specifyPartitionTime, illust.score)
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     * @throws ResourceNotExist ("images", number[]) 给出的部分images不存在。给出不存在的image id列表
     */
    fun partialUpdateCollectionImages(id: Int, form: IllustCollectionImagesPartialUpdateForm) {
        data.db.transaction {
            val illust = data.db.sequenceOf(Illusts).filter { retrieveCondition(id, IllustType.COLLECTION) }.firstOrNull() ?: throw be(NotFound())

            if(form.illustIds.isEmpty()) throw be(ParamError("images"))

            when(form.action) {
                BatchAction.ADD -> {
                    val images = illustManager.unfoldImages(form.illustIds, sorted = false)
                    illustManager.addImagesToCollection(illust.id, images, form.ordinal, form.specifyPartitionTime, illust.score)
                }
                BatchAction.DELETE -> {
                    illustManager.removeImagesFromCollection(illust.id, form.illustIds, illust.score)
                }
                else -> throw be(ParamError("action"))
            }
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     * @throws ResourceNotExist ("topics", number[]) 部分topics资源不存在。给出不存在的topic id列表
     * @throws ResourceNotExist ("authors", number[]) 部分authors资源不存在。给出不存在的author id列表
     * @throws ResourceNotExist ("tags", number[]) 部分tags资源不存在。给出不存在的tag id列表
     * @throws ResourceNotSuitable ("tags", number[]) 部分tags资源不适用。地址段不适用于此项。给出不适用的tag id列表
     * @throws ConflictingGroupMembersError 发现标签冲突组
     */
    fun updateImage(id: Int, form: IllustUpdateForm, preIllust: Illust? = null) {
        data.db.transaction {
            val illust = preIllust ?: data.db.sequenceOf(Illusts).firstOrNull { retrieveCondition(id, IllustType.IMAGE) } ?: throw be(NotFound())
            val parent by lazy { if(illust.parentId == null) null else
                data.db.sequenceOf(Illusts).first { (Illusts.type eq IllustModelType.COLLECTION) and (Illusts.id eq illust.parentId) }
            }

            form.score.alsoOpt { if(it != null) kit.validateScore(it) }
            //处理属性导出
            val newDescription = form.description.letOpt { it ?: "" }
            val newExportedDescription = newDescription.letOpt { it.ifEmpty { parent?.description ?: "" } }
            val newExportedScore = form.score.letOpt { it ?: parent?.score }
            //处理metaTag导出
            val metaResponse = if(anyOpt(form.tags, form.authors, form.topics)) {
                kit.updateMeta(id, newTags = form.tags, newAuthors = form.authors, newTopics = form.topics, copyFromParent = illust.parentId).first
            }else null
            //处理tagme变化
            val newTagme = if(form.tagme.isPresent) form.tagme else if(metaResponse != null && metaResponse != Illust.Tagme.EMPTY) Opt(illust.tagme - metaResponse) else undefined()
            //处理partition变化
            val newPartitionTime = if(form.partitionTime.isPresent) form.partitionTime
                else if(appdata.setting.meta.bindingPartitionWithOrderTime) form.orderTime.letOpt { it.toPartitionDate(appdata.setting.server.timeOffsetHour) }.mapNullable { if(it != illust.partitionTime) it else null }
                else undefined()

            //主体属性更新
            if(anyOpt(newTagme, newDescription, newExportedDescription, form.score, newExportedScore, form.favorite, newPartitionTime, form.orderTime)) {
                data.db.update(Illusts) {
                    where { it.id eq id }
                    newTagme.applyOpt { set(it.tagme, this) }
                    newDescription.applyOpt { set(it.description, this) }
                    newExportedDescription.applyOpt { set(it.exportedDescription, this) }
                    form.score.applyOpt { set(it.score, this) }
                    newExportedScore.applyOpt { set(it.exportedScore, this) }
                    form.favorite.applyOpt { set(it.favorite, this) }
                    newPartitionTime.applyOpt { set(it.partitionTime, this) }
                    form.orderTime.applyOpt { set(it.orderTime, this.toEpochMilli()) }
                }
            }

            val metaTagSot = anyOpt(form.tags, form.authors, form.topics)
            val listUpdated = anyOpt(form.score, form.favorite, form.orderTime, newTagme)
            val detailUpdated = listUpdated || metaTagSot || newDescription.isPresent || newPartitionTime.isPresent
            if(listUpdated || detailUpdated) {
                bus.emit(IllustUpdated(id, IllustType.IMAGE,
                    listUpdated = listUpdated, detailUpdated = true,
                    metaTagSot = metaTagSot,
                    scoreSot = form.score.isPresent,
                    descriptionSot = form.description.isPresent,
                    favoriteSot = form.favorite.isPresent,
                    tagmeSot = newTagme.isPresent,
                    timeSot = form.orderTime.isPresent || newPartitionTime.isPresent
                ))
            }
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     * @throws ResourceNotExist ("collectionId", number) 新id指定的parent不存在。给出collection id
     * @throws ResourceNotExist ("associateId", number) 新id指定的associate不存在。给出id
     */
    fun updateImageRelatedItems(id: Int, form: IllustImageRelatedUpdateForm) {
        data.db.transaction {
            val illust = data.db.sequenceOf(Illusts).firstOrNull { retrieveCondition(id, IllustType.IMAGE) } ?: throw be(NotFound())

            form.associates.alsoOpt { newAssociates ->
                associateManager.setAssociatesOfIllust(id, newAssociates ?: emptyList())
            }

            form.collectionId.alsoOpt { newParentId ->
                if(illust.parentId != newParentId) {
                    val newParent = if(newParentId == null) null else {
                        data.db.sequenceOf(Illusts).firstOrNull { (it.id eq newParentId) and (it.type eq IllustModelType.COLLECTION) }
                            ?: throw be(ResourceNotExist("collectionId", newParentId))
                    }
                    //处理属性导出
                    val exportedScore = illust.score ?: newParent?.score
                    val exportedDescription = illust.description.ifEmpty { newParent?.description ?: "" }
                    kit.refreshAllMeta(id, copyFromParent = newParentId)
                    //处理主体属性变化
                    data.db.update(Illusts) {
                        where { it.id eq id }
                        set(it.parentId, newParentId)
                        set(it.type, if(newParentId != null) IllustModelType.IMAGE_WITH_PARENT else IllustModelType.IMAGE)
                        set(it.exportedScore, exportedScore)
                        set(it.exportedDescription, exportedDescription)
                    }

                    //更换image的parent时，需要对三个方面重导出：image自己; 旧parent; 新parent
                    val now = Instant.now()
                    if(newParent != null) {
                        illustManager.processCollectionChildrenChanged(newParent.id, 1, now)
                    }
                    if(illust.parentId != null) {
                        //处理旧parent
                        illustManager.processCollectionChildrenChanged(illust.parentId, -1, now)
                    }
                }
            }

            if(form.associates.isPresent || form.collectionId.isPresent) {
                bus.emit(IllustRelatedItemsUpdated(id, IllustType.IMAGE,
                    associateSot = form.associates.isPresent,
                    collectionSot = form.collectionId.isPresent,
                ))
            }

            if(form.collectionId.isPresent && form.collectionId.value != illust.parentId) {
                if(illust.parentId != null) bus.emit(IllustImagesChanged(illust.parentId, emptyList(), listOf(illust.id)))
                if(form.collectionId.value != null) bus.emit(IllustImagesChanged(form.collectionId.value!!, listOf(illust.id), emptyList()))
            }
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     * @throws ResourceNotExist ("site", string) 给出的site不存在
     * @throws ResourceNotExist ("additionalInfo", field) 存在不合法的字段
     * @throws ResourceNotExist ("sourceTagType", string[]) 列出的tagType不存在
     */
    fun updateImageSourceData(id: Int, form: IllustImageSourceDataUpdateForm) {
        data.db.transaction {
            val row = data.db.from(Illusts).select(Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, Illusts.sourcePartName, Illusts.tagme)
                .where { retrieveCondition(id, IllustType.IMAGE) }
                .firstOrNull()
                ?: throw be(NotFound())
            val sourceSite = row[Illusts.sourceSite]
            val sourceId = row[Illusts.sourceId]
            val sourcePart = row[Illusts.sourcePart]
            val sourcePartName = row[Illusts.sourcePartName]
            val tagme = row[Illusts.tagme]!!
            if(form.source.isPresent) {
                illustManager.updateSourceDataOfImage(id, form.source.value, oldTagme = tagme)
                form.source.value?.let { source -> sourceManager.createOrUpdateSourceData(source.sourceSite, source.sourceId, form.status, form.title, form.description, form.tags, form.books, form.relations, form.additionalInfo.letOpt { it.associateBy({ f -> f.field }) { f -> f.value } }, form.publishTime) }
            }else{
                sourceManager.checkSourceSite(sourceSite, sourceId, sourcePart, sourcePartName)?.let { (source, sourceId) ->
                    sourceManager.createOrUpdateSourceData(source, sourceId, form.status, form.title, form.description, form.tags, form.books, form.relations, form.additionalInfo.letOpt { it.associateBy({ f -> f.field }) { f -> f.value } }, form.publishTime)
                }
            }
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun delete(id: Int, options: IllustDeleteOptions, type: IllustType? = null) {
        data.db.transaction {
            val illust = data.db.from(Illusts).select()
                .where { retrieveCondition(id, type) }
                .firstOrNull()
                ?.let { Illusts.createEntity(it) }
                ?: throw be(NotFound())

            illustManager.delete(illust, deleteCollectionChildren = options.deleteCollectionChildren ?: false, deleteCompletely = options.deleteCompletely ?: false)
        }
    }

    /**
     * 批量修改属性。
     * @throws ResourceNotExist ("target", number[]) 选取的资源不存在。
     * @throws ResourceNotExist ("timeInsertBegin"|"timeInsertEnd", number) 选取的时间点项不存在。
     * @throws ResourceNotSuitable ("target", number[]) 不能同时编辑collection和它下属的image。
     */
    fun batchUpdate(form: IllustBatchUpdateForm) {
        data.db.transaction {
            illustManager.bulkUpdate(form)
        }
    }

    /**
     * 克隆图像的属性。
     * @throws ResourceNotExist ("from" | "to", number) 源或目标不存在
     * @throws ResourceNotSuitable ("from" | "to", number) 源或目标类型不适用，不能使用集合
     */
    fun cloneImageProps(form: ImagePropsCloneForm) {
        data.db.transaction {
            illustManager.cloneProps(form.from, form.to, form.props, form.merge, form.deleteFrom)
        }
    }

    /**
     * 单独的API，查看illust的关联组。
     */
    fun getAssociate(id: Int): List<IllustRes> {
        if(!data.db.from(Illusts).select((count() greaterEq 0).aliased("exist")).where { Illusts.id eq id }.first().getBoolean("exist")) {
            throw be(NotFound())
        }
        return associateManager.getAssociatesOfIllust(id)
    }

    /**
     * 单独的API，设置illust的关联组。
     */
    fun setAssociate(id: Int, illusts: List<Int>): List<IllustRes> {
        data.db.transaction {
            val type = data.db.from(Illusts).select(Illusts.type)
                .where { Illusts.id eq id }
                .map { it[Illusts.type]!! }
                .firstOrNull()
                ?: throw be(NotFound())

            associateManager.setAssociatesOfIllust(id, illusts)
            val ret = associateManager.getAssociatesOfIllust(id)

            bus.emit(IllustRelatedItemsUpdated(id, if(type == IllustModelType.COLLECTION) IllustType.COLLECTION else IllustType.IMAGE, associateSot = true))
            for (res in ret) {
                bus.emit(IllustRelatedItemsUpdated(res.id, res.type, associateSot = true))
            }

            return ret
        }
    }

    private fun retrieveCondition(id: Int, type: IllustType?): BinaryExpression<Boolean> {
        return (Illusts.id eq id).runIf(type != null) {
            this and if(type!! == IllustType.COLLECTION) {
                Illusts.type eq IllustModelType.COLLECTION
            }else{
                (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT) or (Illusts.type eq IllustModelType.IMAGE)
            }
        }
    }
}