package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.backend.exporter.BookMetadataExporterTask
import com.heerkirov.hedge.server.components.backend.exporter.BackendExporter
import com.heerkirov.hedge.server.components.backend.exporter.ExporterTask
import com.heerkirov.hedge.server.components.backend.exporter.IllustMetadataExporterTask
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.filter.IllustQueryFilter
import com.heerkirov.hedge.server.dto.filter.LimitAndOffsetFilter
import com.heerkirov.hedge.server.dto.form.*
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.enums.SourceEditStatus
import com.heerkirov.hedge.server.enums.TagAddressType
import com.heerkirov.hedge.server.events.CollectionImagesChanged
import com.heerkirov.hedge.server.events.IllustUpdated
import com.heerkirov.hedge.server.events.SourceDataUpdated
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.kit.IllustKit
import com.heerkirov.hedge.server.functions.manager.*
import com.heerkirov.hedge.server.functions.manager.query.QueryManager
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.utils.business.*
import com.heerkirov.hedge.server.utils.DateTime
import com.heerkirov.hedge.server.utils.DateTime.parseDateTime
import com.heerkirov.hedge.server.utils.DateTime.toMillisecond
import com.heerkirov.hedge.server.utils.filterInto
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.runIf
import com.heerkirov.hedge.server.utils.types.*
import org.ktorm.dsl.*
import org.ktorm.entity.*
import org.ktorm.expression.BinaryExpression
import kotlin.math.roundToInt

class IllustService(private val data: DataRepository,
                    private val bus: EventBus,
                    private val kit: IllustKit,
                    private val illustManager: IllustManager,
                    private val illustExtendManager: IllustExtendManager,
                    private val associateManager: AssociateManager,
                    private val sourceManager: SourceDataManager,
                    private val partitionManager: PartitionManager,
                    private val queryManager: QueryManager,
                    private val backendExporter: BackendExporter) {
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
            .select(Illusts.id, Illusts.type, Illusts.exportedScore, Illusts.favorite, Illusts.tagme, Illusts.orderTime, Illusts.cachedChildrenCount,
                Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart,
                FileRecords.id, FileRecords.folder, FileRecords.extension, FileRecords.status)
            .whereWithConditions {
                it += when(filter.type) {
                    IllustType.COLLECTION -> (Illusts.type eq IllustModelType.COLLECTION) or (Illusts.type eq IllustModelType.IMAGE)
                    IllustType.IMAGE -> (Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)
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

    fun findByIds(imageIds: List<Int>): List<IllustRes> {
        return data.db.from(Illusts)
            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
            .select(Illusts.id, Illusts.type, Illusts.exportedScore, Illusts.favorite, Illusts.tagme, Illusts.orderTime, Illusts.cachedChildrenCount,
                Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart,
                FileRecords.id, FileRecords.folder, FileRecords.extension, FileRecords.status)
            .where { Illusts.id inList imageIds }
            .map { it[Illusts.id]!! to newIllustRes(it) }
            .toMap()
            .let { r -> imageIds.mapNotNull { r[it] } }
    }

    /**
     * @throws NotFound ?????????????????????
     */
    fun get(id: Int, type: IllustType? = null): IllustDetailRes {
        val row = data.db.from(Illusts)
            .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
            .select(
                FileRecords.id, FileRecords.folder, FileRecords.extension, FileRecords.status,
                FileRecords.extension, FileRecords.size, FileRecords.resolutionWidth, FileRecords.resolutionHeight,
                Illusts.type, Illusts.cachedChildrenCount, Illusts.description, Illusts.score,
                Illusts.exportedDescription, Illusts.exportedScore, Illusts.favorite, Illusts.tagme,
                Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart,
                Illusts.partitionTime, Illusts.orderTime, Illusts.createTime, Illusts.updateTime)
            .where { retrieveCondition(id, type) }
            .firstOrNull()
            ?: throw be(NotFound())

        val (file, thumbnailFile) = takeAllFilepath(row)
        val extension = row[FileRecords.extension]!!
        val size = row[FileRecords.size]!!
        val resolutionWidth = row[FileRecords.resolutionWidth]!!
        val resolutionHeight = row[FileRecords.resolutionHeight]!!

        val finalType = type ?: if(row[Illusts.type]!! == IllustModelType.COLLECTION) IllustType.COLLECTION else IllustType.IMAGE
        val childrenCount = row[Illusts.cachedChildrenCount]!!.takeIf { finalType == IllustType.COLLECTION }
        val originDescription = row[Illusts.description]!!
        val originScore = row[Illusts.score]
        val description = row[Illusts.exportedDescription]!!
        val score = row[Illusts.exportedScore]
        val favorite = row[Illusts.favorite]!!
        val tagme = row[Illusts.tagme]!!
        val source = row[Illusts.sourceSite]
        val sourceId = row[Illusts.sourceId]
        val sourcePart = row[Illusts.sourcePart]
        val partitionTime = row[Illusts.partitionTime]!!
        val orderTime = row[Illusts.orderTime]!!.parseDateTime()
        val createTime = row[Illusts.createTime]!!
        val updateTime = row[Illusts.updateTime]!!

        val authorColors = data.setting.meta.authorColors
        val topicColors = data.setting.meta.topicColors

        val topics = data.db.from(Topics)
            .innerJoin(IllustTopicRelations, IllustTopicRelations.topicId eq Topics.id)
            .select(Topics.id, Topics.name, Topics.type, IllustTopicRelations.isExported)
            .where { IllustTopicRelations.illustId eq id }
            .orderBy(Topics.type.asc(), Topics.id.asc())
            .map {
                val topicType = it[Topics.type]!!
                val color = topicColors[topicType]
                TopicSimpleRes(it[Topics.id]!!, it[Topics.name]!!, topicType, it[IllustTopicRelations.isExported]!!, color)
            }

        val authors = data.db.from(Authors)
            .innerJoin(IllustAuthorRelations, IllustAuthorRelations.authorId eq Authors.id)
            .select(Authors.id, Authors.name, Authors.type, IllustAuthorRelations.isExported)
            .where { IllustAuthorRelations.illustId eq id }
            .orderBy(Authors.type.asc(), Authors.id.asc())
            .map {
                val authorType = it[Authors.type]!!
                val color = authorColors[authorType]
                AuthorSimpleRes(it[Authors.id]!!, it[Authors.name]!!, authorType, it[IllustAuthorRelations.isExported]!!, color)
            }

        val tags = data.db.from(Tags)
            .innerJoin(IllustTagRelations, IllustTagRelations.tagId eq Tags.id)
            .select(Tags.id, Tags.name, Tags.color, IllustTagRelations.isExported)
            .where { (IllustTagRelations.illustId eq id) and (Tags.type eq TagAddressType.TAG) }
            .orderBy(Tags.globalOrdinal.asc())
            .map { TagSimpleRes(it[Tags.id]!!, it[Tags.name]!!, it[Tags.color], it[IllustTagRelations.isExported]!!) }

        return IllustDetailRes(
            id, finalType, childrenCount,
            file, thumbnailFile,
            extension, size, resolutionWidth, resolutionHeight,
            topics, authors, tags,
            description, score, favorite, tagme,
            originDescription, originScore,
            source, sourceId, sourcePart,
            partitionTime, orderTime, createTime, updateTime
        )
    }

    /**
     * @throws NotFound ?????????????????????
     * @throws ResourceNotExist ("topics", number[]) ??????topics????????????????????????????????????topic id??????
     * @throws ResourceNotExist ("authors", number[]) ??????authors????????????????????????????????????author id??????
     * @throws ResourceNotExist ("tags", number[]) ??????tags????????????????????????????????????tag id??????
     * @throws ResourceNotSuitable ("tags", number[]) ??????tags??????????????????????????????????????????????????????????????????tag id??????
     * @throws ConflictingGroupMembersError ?????????????????????
     */
    fun update(id: Int, form: IllustImageUpdateForm) {
        val illust = data.db.sequenceOf(Illusts).firstOrNull { Illusts.id eq id } ?: throw be(NotFound())
        if(illust.type == IllustModelType.COLLECTION) {
            updateCollection(id, form, illust)
        }else{
            updateImage(id, form, illust)
        }
    }

    /**
     * @throws NotFound ?????????????????????
     */
    fun getCollectionRelatedItems(id: Int): IllustCollectionRelatedRes {
        data.db.sequenceOf(Illusts).firstOrNull { retrieveCondition(id, IllustType.COLLECTION) } ?: throw be(NotFound())
        
        val associates = associateManager.getAssociatesOfIllust(id)

        return IllustCollectionRelatedRes(associates)
    }

    fun getCollectionImages(id: Int, filter: LimitAndOffsetFilter): ListResult<IllustRes> {
        return data.db.from(Illusts)
            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
            .select(Illusts.id, Illusts.type, Illusts.exportedScore, Illusts.favorite, Illusts.tagme, Illusts.orderTime,
                Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart,
                FileRecords.id, FileRecords.folder, FileRecords.extension, FileRecords.status)
            .where { (Illusts.parentId eq id) and (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT) }
            .limit(filter.offset, filter.limit)
            .orderBy(Illusts.orderTime.asc())
            .toListResult(::newIllustRes)
    }

    /**
     * @throws NotFound ?????????????????????
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
            .select(Illusts.id, Illusts.cachedChildrenCount, FileRecords.id, FileRecords.folder, FileRecords.extension, FileRecords.status)
            .where { Illusts.id eq parentId }
            .firstOrNull()
            ?.let { IllustParent(it[Illusts.id]!!, takeThumbnailFilepath(it), it[Illusts.cachedChildrenCount]!!) }

        val books = data.db.from(Books)
            .innerJoin(BookImageRelations, BookImageRelations.bookId eq Books.id)
            .select(Books.id, Books.title)
            .where { BookImageRelations.imageId eq id }
            .map { BookSimpleRes(it[Books.id]!!, it[Books.title]!!) }

        val folders = data.db.from(Folders)
            .innerJoin(FolderImageRelations, FolderImageRelations.folderId eq Folders.id)
            .select(Folders.id, Folders.title, Folders.parentAddress, Folders.type)
            .where { FolderImageRelations.imageId eq id }
            .map { FolderSimpleRes(it[Folders.id]!!, (it[Folders.parentAddress] ?: emptyList()) + it[Folders.title]!!, it[Folders.type]!!) }

        val associates = associateManager.getAssociatesOfIllust(id)

        return IllustImageRelatedRes(parent, books, folders, associates)
    }

    /**
     * @throws NotFound ?????????????????????
     */
    fun getImageSourceData(id: Int): IllustImageSourceDataRes {
        val row = data.db.from(Illusts)
            .select(Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart)
            .where { retrieveCondition(id, IllustType.IMAGE) }
            .firstOrNull()
            ?: throw be(NotFound())

        val source = row[Illusts.sourceSite]
        val sourceId = row[Illusts.sourceId]
        val sourcePart = row[Illusts.sourcePart]
        return if(source != null && sourceId != null) {
            val sourceTitle = data.setting.source.sites.find { it.name == source }?.title
            val sourceRow = data.db.from(SourceDatas).select()
                .where { (SourceDatas.sourceSite eq source) and (SourceDatas.sourceId eq sourceId) }
                .firstOrNull()
            if(sourceRow != null) {
                val sourceRowId = sourceRow[SourceDatas.id]!!
                val sourceTags = data.db.from(SourceTags)
                    .innerJoin(SourceTagRelations, (SourceTags.id eq SourceTagRelations.sourceTagId) and (SourceTagRelations.sourceDataId eq sourceRowId))
                    .select()
                    .map { SourceTags.createEntity(it) }
                    .map { SourceTagDto(it.code, it.name, it.otherName, it.type) }
                val sourcePools = data.db.from(SourceBooks)
                    .innerJoin(SourceBookRelations, (SourceBooks.id eq SourceBookRelations.sourceBookId) and (SourceBookRelations.sourceDataId eq sourceRowId))
                    .select()
                    .map { SourceBooks.createEntity(it) }
                    .map { SourceBookDto(it.code, it.title) }

                IllustImageSourceDataRes(source, sourceTitle ?: source, sourceId, sourcePart,
                    sourceRow[SourceDatas.empty]!!, sourceRow[SourceDatas.status]!!,
                    sourceRow[SourceDatas.title] ?: "", sourceRow[SourceDatas.description] ?: "",
                    sourceTags, sourcePools,
                    sourceRow[SourceDatas.relations] ?: emptyList())
            }else{
                IllustImageSourceDataRes(source, sourceTitle ?: source, sourceId, sourcePart,
                    true, SourceEditStatus.NOT_EDITED, "", "", emptyList(), emptyList(), emptyList())
            }
        }else{
            IllustImageSourceDataRes(null, null, null, null, true, SourceEditStatus.NOT_EDITED, null, null, null, null, null)
        }
    }

    /**
     * @throws ResourceNotExist ("images", number[]) ???????????????images??????????????????????????????image id??????
     */
    fun createCollection(form: IllustCollectionCreateForm): Int {
        if(form.score != null) kit.validateScore(form.score)
        data.db.transaction {
            return illustManager.newCollection(form.images, form.description ?: "", form.score, form.favorite, form.tagme)
        }
    }

    /**
     * @throws NotFound ?????????????????????
     * @throws ResourceNotExist ("topics", number[]) ??????topics????????????????????????????????????topic id??????
     * @throws ResourceNotExist ("authors", number[]) ??????authors????????????????????????????????????author id??????
     * @throws ResourceNotExist ("tags", number[]) ??????tags????????????????????????????????????tag id??????
     * @throws ResourceNotSuitable ("tags", number[]) ??????tags??????????????????????????????????????????????????????????????????tag id??????
     * @throws ConflictingGroupMembersError ?????????????????????
     */
    fun updateCollection(id: Int, form: IllustCollectionUpdateForm, preIllust: Illust? = null) {
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
            val newDescription = form.description.letOpt { it ?: "" }
            if(anyOpt(form.tags, form.authors, form.topics)) {
                kit.updateMeta(id, newTags = form.tags, newAuthors = form.authors, newTopics = form.topics, copyFromChildren = true)
            }

            val newTagme = if(form.tagme.isPresent) form.tagme else if(data.setting.meta.autoCleanTagme && anyOpt(form.tags, form.authors, form.topics)) {
                Opt(illust.tagme
                    .runIf(form.tags.isPresent) { this - Illust.Tagme.TAG }
                    .runIf(form.authors.isPresent) { this - Illust.Tagme.AUTHOR }
                    .runIf(form.topics.isPresent) { this - Illust.Tagme.TOPIC }
                )
            }else undefined()

            if(anyOpt(newTagme, newDescription, form.score, form.favorite)) {
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
                }
            }

            if(anyOpt(form.tags, form.authors, form.topics, form.description, form.score)) {
                val children = data.db.from(Illusts).select(Illusts.id).where { Illusts.parentId eq id }.map { it[Illusts.id]!! }
                backendExporter.add(children.map { IllustMetadataExporterTask(it,
                    exportScore = form.score.isPresent,
                    exportDescription = form.description.isPresent,
                    exportMetaTag = anyOpt(form.tags, form.topics, form.authors)) })
            }

            val generalUpdated = anyOpt(newTagme, newDescription, form.score, form.favorite)
            val metaTagUpdated = anyOpt(form.tags, form.authors, form.topics)
            bus.emit(IllustUpdated(id, IllustType.COLLECTION, generalUpdated, metaTagUpdated, sourceDataUpdated = false, relatedItemsUpdated = false))
        }
    }

    /**
     * @throws NotFound ?????????????????????
     * @throws ResourceNotExist ("associateId", number) ???id?????????associate??????????????????id
     */
    fun updateCollectionRelatedItems(id: Int, form: IllustCollectionRelatedUpdateForm) {
        data.db.transaction {
            data.db.sequenceOf(Illusts).firstOrNull { retrieveCondition(id, IllustType.COLLECTION) } ?: throw be(NotFound())

            form.associates.alsoOpt { newAssociates ->
                associateManager.setAssociatesOfIllust(id, newAssociates ?: emptyList())

                bus.emit(IllustUpdated(id, IllustType.COLLECTION,
                    generalUpdated = false,
                    metaTagUpdated = false,
                    sourceDataUpdated = false,
                    relatedItemsUpdated = true
                ))
            }
        }
    }

    /**
     * @throws NotFound ?????????????????????
     * @throws ResourceNotExist ("images", number[]) ???????????????images??????????????????????????????image id??????
     */
    fun updateCollectionImages(id: Int, imageIds: List<Int>) {
        data.db.transaction {
            val illust = data.db.sequenceOf(Illusts).filter { retrieveCondition(id, IllustType.COLLECTION) }.firstOrNull() ?: throw be(NotFound())

            val images = illustManager.unfoldImages(imageIds, sorted = false)
            val (fileId, scoreFromSub, partitionTime, orderTime) = kit.getExportedPropsFromList(images)

            data.db.update(Illusts) {
                where { it.id eq id }
                set(it.fileId, fileId)
                set(it.cachedChildrenCount, images.size)
                set(it.exportedScore, illust.score ?: scoreFromSub)
                set(it.partitionTime, partitionTime)
                set(it.orderTime, orderTime)
                set(it.updateTime, DateTime.now())
            }

            illustManager.updateSubImages(id, images)

            kit.refreshAllMeta(id, copyFromChildren = true)

            bus.emit(CollectionImagesChanged(id))
        }
    }

    /**
     * @throws NotFound ?????????????????????
     * @throws ResourceNotExist ("topics", number[]) ??????topics????????????????????????????????????topic id??????
     * @throws ResourceNotExist ("authors", number[]) ??????authors????????????????????????????????????author id??????
     * @throws ResourceNotExist ("tags", number[]) ??????tags????????????????????????????????????tag id??????
     * @throws ResourceNotSuitable ("tags", number[]) ??????tags??????????????????????????????????????????????????????????????????tag id??????
     * @throws ConflictingGroupMembersError ?????????????????????
     */
    fun updateImage(id: Int, form: IllustImageUpdateForm, preIllust: Illust? = null) {
        data.db.transaction {
            val illust = preIllust ?: data.db.sequenceOf(Illusts).firstOrNull { retrieveCondition(id, IllustType.IMAGE) } ?: throw be(NotFound())
            val parent by lazy { if(illust.parentId == null) null else
                data.db.sequenceOf(Illusts).first { (Illusts.type eq IllustModelType.COLLECTION) and (Illusts.id eq illust.parentId) }
            }

            form.score.alsoOpt { if(it != null) kit.validateScore(it) }
            //??????????????????
            val newDescription = form.description.letOpt { it ?: "" }
            val newExportedDescription = newDescription.letOpt { it.ifEmpty { parent?.description ?: "" } }
            val newExportedScore = form.score.letOpt { it ?: parent?.score }
            //??????metaTag??????
            if(anyOpt(form.tags, form.authors, form.topics)) {
                kit.updateMeta(id, newTags = form.tags, newAuthors = form.authors, newTopics = form.topics, copyFromParent = illust.parentId)
            }
            //??????tagme??????
            val newTagme = if(form.tagme.isPresent) form.tagme else if(data.setting.meta.autoCleanTagme && anyOpt(form.tags, form.authors, form.topics)) {
                Opt(illust.tagme
                    .runIf(form.tags.isPresent) { this - Illust.Tagme.TAG }
                    .runIf(form.authors.isPresent) { this - Illust.Tagme.AUTHOR }
                    .runIf(form.topics.isPresent) { this - Illust.Tagme.TOPIC }
                )
            }else undefined()
            //??????partition??????
            form.partitionTime.alsoOpt {
                if(illust.partitionTime != it) partitionManager.updateItemPartition(illust.partitionTime, it)
            }
            //??????????????????
            if(anyOpt(newTagme, newDescription, newExportedDescription, form.score, newExportedScore, form.favorite, form.partitionTime, form.orderTime)) {
                data.db.update(Illusts) {
                    where { it.id eq id }
                    newTagme.applyOpt { set(it.tagme, this) }
                    newDescription.applyOpt { set(it.description, this) }
                    newExportedDescription.applyOpt { set(it.exportedDescription, this) }
                    form.score.applyOpt { set(it.score, this) }
                    newExportedScore.applyOpt { set(it.exportedScore, this) }
                    form.favorite.applyOpt { set(it.favorite, this) }
                    form.partitionTime.applyOpt { set(it.partitionTime, this) }
                    form.orderTime.applyOpt { set(it.orderTime, this.toMillisecond()) }
                }
            }

            //??????parent???exporter task
            if(illust.parentId != null) {
                //????????????score??????parent???score???????????????????????????score
                val exportScore = form.score.isPresent && parent!!.score == null
                //????????????metaTag??????parent???????????????notExported metaTag??????????????????metaTag
                val exportMeta = anyOpt(form.tags, form.authors, form.topics) && !kit.anyNotExportedMetaExists(illust.parentId)
                //????????????time??????parent???first child??????????????????????????????first cover
                val exportFirstCover = anyOpt(form.orderTime, form.partitionTime) && kit.getFirstChildOfCollection(illust.parentId).id == id
                //??????task
                if(exportScore || exportMeta || exportFirstCover) {
                    backendExporter.add(IllustMetadataExporterTask(illust.parentId, exportScore = exportScore, exportMetaTag = exportMeta, exportFirstCover = exportFirstCover))
                }
            }

            //??????book???exporter task
            val bookIds = data.db.from(Books)
                .innerJoin(BookImageRelations, BookImageRelations.bookId eq Books.id)
                .select(Books.id)
                .where { BookImageRelations.imageId eq id }
                .map { it[Books.id]!! }
            if(bookIds.isNotEmpty()) {
                val exportMeta = anyOpt(form.tags, form.authors, form.topics)
                if(exportMeta) {
                    for (bookId in bookIds) {
                        backendExporter.add(BookMetadataExporterTask(bookId, exportMetaTag = true))
                    }
                }
            }

            val generalUpdated = anyOpt(newTagme, newDescription, form.score, form.favorite, form.partitionTime, form.orderTime)
            val metaTagUpdated = anyOpt(form.tags, form.authors, form.topics)
            bus.emit(IllustUpdated(id, IllustType.IMAGE, generalUpdated, metaTagUpdated, sourceDataUpdated = false, relatedItemsUpdated = false))
        }
    }

    /**
     * @throws NotFound ?????????????????????
     * @throws ResourceNotExist ("collectionId", number) ???id?????????parent??????????????????collection id
     * @throws ResourceNotExist ("associateId", number) ???id?????????associate??????????????????id
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
                    //??????????????????
                    val exportedScore = illust.score ?: newParent?.score
                    val exportedDescription = illust.description.ifEmpty { newParent?.description ?: "" }
                    val anyNotExportedMetaExists = kit.anyNotExportedMetaExists(id)
                    if(!anyNotExportedMetaExists) {
                        kit.refreshAllMeta(id, copyFromParent = newParentId)
                    }
                    //????????????????????????
                    data.db.update(Illusts) {
                        where { it.id eq id }
                        set(it.parentId, newParentId)
                        set(it.type, if(newParentId != null) IllustModelType.IMAGE_WITH_PARENT else IllustModelType.IMAGE)
                        set(it.exportedScore, exportedScore)
                        set(it.exportedDescription, exportedDescription)
                    }

                    //??????image???parent???????????????????????????????????????image??????; ???parent; ???parent
                    val now = DateTime.now()
                    if(newParent != null) {
                        illustManager.processCollectionChildrenAdded(newParent.id, illust, now, exportMetaTags = anyNotExportedMetaExists, exportScore = illust.score != null)
                    }
                    if(illust.parentId != null) {
                        //?????????parent
                        illustManager.processCollectionChildrenRemoved(illust.parentId, listOf(illust), now, exportMetaTags = anyNotExportedMetaExists, exportScore = illust.score != null)
                    }
                }
            }

            if(form.associates.isPresent || form.collectionId.isPresent) {
                bus.emit(IllustUpdated(id, IllustType.IMAGE,
                    generalUpdated = false,
                    metaTagUpdated = false,
                    sourceDataUpdated = false,
                    relatedItemsUpdated = true
                ))
            }
        }
    }

    /**
     * @throws NotFound ?????????????????????
     * @throws ResourceNotExist ("site", string) ?????????site?????????
     */
    fun updateImageSourceData(id: Int, form: IllustImageSourceDataUpdateForm) {
        data.db.transaction {
            val row = data.db.from(Illusts).select(Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, Illusts.tagme)
                .where { retrieveCondition(id, IllustType.IMAGE) }
                .firstOrNull()
                ?: throw be(NotFound())
            val sourceSite = row[Illusts.sourceSite]
            val sourceId = row[Illusts.sourceId]
            val sourcePart = row[Illusts.sourcePart]
            val tagme = row[Illusts.tagme]!!
            if(form.sourceSite.isPresent || form.sourceId.isPresent || form.sourcePart.isPresent) {
                val newSourcePart = form.sourcePart.unwrapOr { sourcePart }
                val (newSourceDataId, newSourceSite, newSourceId) = sourceManager.checkSourceSite(form.sourceSite.unwrapOr { sourceSite }, form.sourceId.unwrapOr { sourceId }, newSourcePart)
                    ?.let { (source, sourceId) -> sourceManager.createOrUpdateSourceData(source, sourceId, form.status, form.title, form.description, form.tags, form.books, form.relations) }
                    ?: Triple(null, null, null)
                data.db.update(Illusts) {
                    where { it.id eq id }
                    set(it.sourceDataId, newSourceDataId)
                    set(it.sourceSite, newSourceSite)
                    set(it.sourceId, newSourceId)
                    set(it.sourcePart, newSourcePart)
                    if(data.setting.meta.autoCleanTagme && Illust.Tagme.SOURCE in tagme) set(it.tagme, tagme - Illust.Tagme.SOURCE)
                }
            }else{
                sourceManager.checkSourceSite(sourceSite, sourceId, sourcePart)?.let { (source, sourceId) ->
                    sourceManager.createOrUpdateSourceData(source, sourceId, form.status, form.title, form.description, form.tags, form.books, form.relations)
                }
            }

            bus.emit(IllustUpdated(id, IllustType.IMAGE,
                generalUpdated = false,
                metaTagUpdated = false,
                sourceDataUpdated = true,
                relatedItemsUpdated = false
            ))
        }
    }

    /**
     * @throws NotFound ?????????????????????
     */
    fun delete(id: Int, type: IllustType? = null) {
        data.db.transaction {
            val illust = data.db.from(Illusts).select()
                .where { retrieveCondition(id, type) }
                .firstOrNull()
                ?.let { Illusts.createEntity(it) }
                ?: throw be(NotFound())

            illustExtendManager.delete(illust)
        }
    }

    /**
     * ?????????????????????
     * @throws ResourceNotExist ("target", number[]) ???????????????????????????
     * @throws ResourceNotSuitable ("target", number[]) ??????????????????collection???????????????image???
     */
    fun batchUpdate(form: IllustBatchUpdateForm) {
        if(form.target.isEmpty()) return
        data.db.transaction {
            val records = data.db.sequenceOf(Illusts).filter { it.id inList form.target }.toList().also { records ->
                val targetSet = form.target.toSet()
                if(records.size < form.target.size) {
                    throw be(ResourceNotExist("target", targetSet - records.map { it.id }.toSet()))
                }else if(records.any { it.parentId in targetSet }) {
                    throw be(ResourceNotSuitable("target", records.filter { it.parentId in targetSet }))
                }
            }
            val (collections, images) = records.filterInto { it.type == IllustModelType.COLLECTION }
            val collectionIds by lazy { collections.map { it.id } }
            val imageIds by lazy { images.map { it.id } }
            val childrenOfCollections by lazy { if(collections.isEmpty()) emptyList() else data.db.sequenceOf(Illusts).filter { it.parentId inList collectionIds }.toList() }

            val exporterTasks = mutableListOf<ExporterTask>()

            //favorite
            form.favorite.alsoOpt { favorite ->
                data.db.update(Illusts) {
                    where { it.id inList form.target }
                    set(it.favorite, favorite)
                }
            }

            //score
            form.score.alsoOpt { score ->
                if(score != null) {
                    kit.validateScore(score)

                    //?????????score??????????????????????????????score
                    data.db.update(Illusts) {
                        where { it.id inList form.target }
                        set(it.score, score)
                        set(it.exportedScore, score)
                    }

                    exporterTasks.addAll(childrenOfCollections.map { IllustMetadataExporterTask(it.id, exportScore = true) })
                    exporterTasks.addAll(images.mapNotNull { it.parentId }.map { IllustMetadataExporterTask(it, exportScore = true) })
                }else{
                    //?????????null???????????????????????????collection,??????children???????????????
                    val collectionScores = if(collections.isNotEmpty()) emptyMap() else data.db.from(Illusts)
                        .select(Illusts.parentId, count(Illusts.id).aliased("count"), avg(Illusts.score).aliased("score"))
                        .where { Illusts.parentId inList collectionIds }
                        .groupBy(Illusts.parentId)
                        .associate {
                            it[Illusts.parentId]!! to if(it.getInt("count") > 0) it.getDouble("score").roundToInt() else null
                        }
                    //????????????image,?????????parent???score
                    val imageScores = if(images.isEmpty()) emptyMap() else data.db.from(Illusts)
                        .select(Illusts.id, Illusts.score)
                        .where { Illusts.id inList images.mapNotNull { it.parentId } }
                        .associate { it[Illusts.id]!! to it[Illusts.score] }
                    //???????????????db
                    data.db.batchUpdate(Illusts) {
                        for (record in records) {
                            item {
                                where { it.id eq record.id }
                                set(it.score, null)
                                set(it.exportedScore, if(record.type == IllustModelType.COLLECTION) {
                                    collectionScores[record.id]
                                }else{
                                    imageScores[record.parentId]
                                })
                            }
                        }
                    }

                    exporterTasks.addAll(childrenOfCollections.map { IllustMetadataExporterTask(it.id, exportScore = true) })
                    exporterTasks.addAll(images.mapNotNull { it.parentId }.map { IllustMetadataExporterTask(it, exportScore = true) })
                }
            }

            //description
            form.description.alsoOpt { description ->
                if(!description.isNullOrEmpty()) {
                    //?????????description??????????????????????????????description
                    data.db.update(Illusts) {
                        where { it.id inList form.target }
                        set(it.description, description)
                        set(it.exportedDescription, description)
                    }

                    if(childrenOfCollections.isNotEmpty()) {
                        exporterTasks.addAll(childrenOfCollections.map { IllustMetadataExporterTask(it.id, exportDescription = true) })
                    }
                }else{
                    //?????????empty???????????????????????????collection????????????????????????image,???????????????parent???description
                    if(collections.isNotEmpty()) {
                        data.db.update(Illusts) {
                            where { it.id inList collectionIds }
                            set(it.description, "")
                            set(it.exportedDescription, "")
                        }

                        if(childrenOfCollections.isNotEmpty()) {
                            exporterTasks.addAll(childrenOfCollections.map { IllustMetadataExporterTask(it.id, exportDescription = true) })
                        }
                    }
                    if(images.isNotEmpty()) {
                        val imageDescriptions = data.db.from(Illusts)
                            .select(Illusts.id, Illusts.description)
                            .where { Illusts.id inList images.mapNotNull { it.parentId } }
                            .associate { it[Illusts.id]!! to it[Illusts.description]!! }
                        data.db.batchUpdate(Illusts) {
                            for (record in images) {
                                item {
                                    where { it.id eq record.id }
                                    set(it.description, "")
                                    set(it.exportedDescription, imageDescriptions[record.parentId] ?: "")
                                }
                            }
                        }
                    }
                }
            }

            //meta tag
            if(anyOpt(form.tags, form.topics, form.authors)) {
                //??????meta tag??????????????????????????????????????????batch????????????????????????????????????
                for (illust in images) {
                    kit.updateMeta(illust.id, newTags = form.tags, newAuthors = form.authors, newTopics = form.topics, copyFromParent = illust.parentId)

                    if(illust.parentId != null && !kit.anyNotExportedMetaExists(illust.parentId)) {
                        exporterTasks.add(IllustMetadataExporterTask(illust.parentId, exportMetaTag = true))
                    }
                    data.db.from(Books)
                        .innerJoin(BookImageRelations, BookImageRelations.bookId eq Books.id).select(Books.id)
                        .where { BookImageRelations.imageId inList imageIds }.groupBy(Books.id)
                        .forEach { exporterTasks.add(BookMetadataExporterTask(it[Books.id]!!, exportMetaTag = true)) }
                }
                for (illust in collections) {
                    kit.updateMeta(illust.id, newTags = form.tags, newAuthors = form.authors, newTopics = form.topics, copyFromChildren = true)

                    data.db.from(Illusts).select(Illusts.id)
                        .where { Illusts.parentId inList collectionIds }
                        .groupBy(Illusts.id)
                        .forEach { exporterTasks.add(IllustMetadataExporterTask(it[Illusts.id]!!, exportMetaTag = true)) }
                }
            }

            //tagme
            if(form.tagme.isPresent) {
                data.db.update(Illusts) {
                    where { it.id inList form.target }
                    set(it.tagme, form.tagme.value)
                }
            }else if(data.setting.meta.autoCleanTagme && anyOpt(form.tags, form.authors, form.topics)) {
                data.db.batchUpdate(Illusts) {
                    for (record in records) {
                       item {
                           where { it.id eq record.id }
                           set(it.tagme, record.tagme
                               .runIf(form.tags.isPresent) { this - Illust.Tagme.TAG }
                               .runIf(form.authors.isPresent) { this - Illust.Tagme.AUTHOR }
                               .runIf(form.topics.isPresent) { this - Illust.Tagme.TOPIC })
                       }
                    }
                }
            }

            //partition time
            form.partitionTime.alsoOpt { partitionTime ->
                //tips: ?????????????????????????????????????????????collection,???????????????????????????children????????????
                val children = childrenOfCollections.filter { it.partitionTime != partitionTime }.map { Pair(it.id, it.partitionTime) }

                data.db.update(Illusts) {
                    where { it.id inList (children.map { (id, _) -> id } + form.target) }
                    set(it.partitionTime, partitionTime)
                }

                for ((_, oldPartitionTime) in children) {
                   partitionManager.updateItemPartition(oldPartitionTime, partitionTime)
                }
                for (illust in images) {
                   if(illust.partitionTime != partitionTime) {
                       partitionManager.updateItemPartition(illust.partitionTime, partitionTime)
                   }
                }
            }

            //order time
            form.orderTimeBegin.alsoOpt { orderTimeBegin ->
                //????????????image???collection???children???????????????orderTime?????????????????????????????????orderTime??????????????????parent???children????????????
                //??????collection????????????????????????????????????????????????????????????????????????collection???orderTime???????????????????????????orderTime????????????
                val children = childrenOfCollections.map { Triple(it.id, it.parentId!!, it.orderTime) }

                val seq = records.asSequence()
                    .sortedBy { it.orderTime }
                    .flatMap {
                        if(it.type == IllustModelType.COLLECTION) {
                            children.filter { (_, parentId, _) -> parentId == it.id }.asSequence().sortedBy { (_, _, t) -> t }
                        }else{
                            sequenceOf(Triple(it.id, null, it.orderTime))
                        }
                    }
                    .toList()

                val values = if(seq.size > 1) {
                    val beginMs = orderTimeBegin.toMillisecond()
                    val endMs = form.orderTimeEnd.letOpt {
                        it.toMillisecond().apply {
                            if(it < orderTimeBegin) {
                                throw be(ParamError("orderTimeEnd"))
                            }
                        }
                    }.unwrapOr {
                        //????????????endTime???????????????????????????
                        //??????beginTime??????now??????(??????????????????<2s)????????????now??????endTime
                        //?????????beginTime??????(???????????????<10ms)???????????????now??????????????????????????????1s?????????????????????endTime
                        val nowMs = DateTime.now().toMillisecond()
                        if(nowMs < beginMs + (seq.size - 1) * 2000 && nowMs > beginMs + (seq.size - 1) * 10) {
                            nowMs
                        }else{
                            beginMs + (seq.size - 1) * 1000
                        }
                    }
                    val step = (endMs - beginMs) / (seq.size - 1)
                    var value = beginMs
                    seq.indices.map {
                        value.also {
                            value += step
                        }
                    }
                }else{
                    listOf(orderTimeBegin.toMillisecond())
                }

                data.db.batchUpdate(Illusts) {
                    seq.forEachIndexed { i, (id, _, _) ->
                        item {
                            where { it.id eq id }
                            set(it.orderTime, values[i])
                        }
                    }
                }

                if(collections.isNotEmpty()) {
                    val collectionValues = seq.filter { (_, p, _) -> p != null }
                        .zip(values) { (id, p, _), ot -> Triple(id, p!!, ot) }
                        .groupBy { (_, p, _) -> p }
                        .mapValues { (_, values) -> values.minOf { (_, _, t) -> t } }

                    data.db.batchUpdate(Illusts) {
                        for ((id, ot) in collectionValues) {
                            item {
                                where { it.id eq id }
                                set(it.orderTime, ot)
                            }
                        }
                    }
                }
            }

            val generalUpdated = anyOpt(form.favorite, form.score, form.description, form.tagme, form.partitionTime, form.orderTimeBegin, form.orderTimeEnd)
            val metaTagUpdated = anyOpt(form.tags, form.topics, form.authors)
            if(generalUpdated || metaTagUpdated) {
                for (record in records) {
                    //tips: ????????????????????????????????????????????????partition/orderTime???????????????children????????????
                    bus.emit(IllustUpdated(record.id, record.type.toIllustType(), generalUpdated, metaTagUpdated, sourceDataUpdated = false, relatedItemsUpdated = false))
                }
            }
        }
    }

    /**
     * ????????????????????????
     * @throws ResourceNotExist ("from" | "to", number) ?????????????????????
     * @throws ResourceNotSuitable ("from" | "to", number) ????????????????????????????????????????????????
     */
    fun cloneImageProps(form: ImagePropsCloneForm) {
        data.db.transaction {
            val fromIllust = data.db.sequenceOf(Illusts).firstOrNull { it.id eq form.from } ?: throw be(ResourceNotExist("from", form.from))
            val toIllust = data.db.sequenceOf(Illusts).firstOrNull { it.id eq form.to } ?: throw be(ResourceNotExist("to", form.to))
            if(fromIllust.type == IllustModelType.COLLECTION) throw be(ResourceNotSuitable("from", form.from))
            if(toIllust.type == IllustModelType.COLLECTION) throw be(ResourceNotSuitable("to", form.to))

            illustExtendManager.cloneProps(fromIllust, toIllust, form.props, form.merge)

            if(form.deleteFrom) {
                delete(fromIllust.id, IllustType.IMAGE)
            }
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