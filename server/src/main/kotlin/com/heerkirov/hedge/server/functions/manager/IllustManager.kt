package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.form.IllustBatchUpdateForm
import com.heerkirov.hedge.server.dto.form.IllustImageCreateForm
import com.heerkirov.hedge.server.dto.form.ImagePropsCloneForm
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.enums.TagTopicType
import com.heerkirov.hedge.server.events.*
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.kit.IllustKit
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.utils.DateTime.toInstant
import com.heerkirov.hedge.server.utils.DateTime.toPartitionDate
import com.heerkirov.hedge.server.utils.filterInto
import com.heerkirov.hedge.server.utils.ktorm.first
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import com.heerkirov.hedge.server.utils.letIf
import com.heerkirov.hedge.server.utils.mostCount
import com.heerkirov.hedge.server.utils.tuples.Tuple4
import com.heerkirov.hedge.server.utils.types.anyOpt
import com.heerkirov.hedge.server.utils.types.optOf
import com.heerkirov.hedge.server.utils.types.optOrUndefined
import org.ktorm.dsl.*
import org.ktorm.entity.*
import org.ktorm.support.sqlite.bulkInsertReturning
import java.time.Instant
import java.time.LocalDate
import kotlin.math.abs
import kotlin.math.roundToInt

class IllustManager(private val appdata: AppDataManager,
                    private val data: DataRepository,
                    private val bus: EventBus,
                    private val kit: IllustKit,
                    private val fileManager: FileManager,
                    private val sourceManager: SourceDataManager,
                    private val sourceMappingManager: SourceMappingManager,
                    private val associateManager: AssociateManager,
                    private val bookManager: BookManager,
                    private val folderManager: FolderManager,
                    private val importManager: ImportManager,
                    private val trashManager: TrashManager) {

    /**
     * 批量创建新的image。
     */
    fun bulkNewImage(form: List<IllustImageCreateForm>): Map<Int, Int> {
        return if(form.isNotEmpty()) {
            val sourceToRowIds = form
                .mapNotNull { sourceManager.checkSourceSite(it.source?.sourceSite, it.source?.sourceId, it.source?.sourcePart, it.source?.sourcePartName) }
                .distinct()
                .let { sourceManager.bulkValidateAndCreateSourceDataIfNotExist(it) }

            val returningIds = data.db.bulkInsertReturning(Illusts, Illusts.id) {
                for (record in form) {
                    val newSourceDataId = if(record.source != null) sourceToRowIds[SourceDataIdentity(record.source.sourceSite, record.source.sourceId)] else null
                    item {
                        set(it.type, IllustModelType.IMAGE)
                        set(it.parentId, null)
                        set(it.fileId, record.fileId)
                        set(it.cachedChildrenCount, 0)
                        set(it.cachedBookCount, 0)
                        set(it.sourceDataId, newSourceDataId)
                        set(it.sourceSite, record.source?.sourceSite)
                        set(it.sourceId, record.source?.sourceId)
                        set(it.sortableSourceId, record.source?.sourceId?.toLongOrNull())
                        set(it.sourcePart, record.source?.sourcePart)
                        set(it.sourcePartName, record.source?.sourcePartName)
                        set(it.description, record.description ?: "")
                        set(it.score, record.score)
                        set(it.favorite, record.favorite)
                        set(it.tagme, record.tagme)
                        set(it.exportedDescription, record.description ?: "")
                        set(it.exportedScore, record.score)
                        set(it.partitionTime, record.partitionTime ?: record.orderTime.toPartitionDate(appdata.setting.server.timeOffsetHour))
                        set(it.orderTime, record.orderTime.toEpochMilli())
                        set(it.createTime, record.createTime)
                        set(it.updateTime, record.createTime)
                    }
                }
            }

            if(returningIds.any { it == null }) {
                val nullIndexes = returningIds.mapIndexedNotNull { index, i -> if(i != null) index else null }
                throw RuntimeException("Some images insert failed. Indexes are [${nullIndexes.joinToString(", ")}]")
            }

            @Suppress("UNCHECKED_CAST")
            val ids = returningIds as List<Int>

            for (i in form.indices) {
                val record = form[i]
                if(!record.tags.isNullOrEmpty() || !record.topics.isNullOrEmpty() || !record.authors.isNullOrEmpty()) {
                    kit.updateMeta(ids[i], creating = true, newTags = optOrUndefined(record.tags?.ifEmpty { null }), newTopics = optOrUndefined(record.topics?.ifEmpty { null }), newAuthors = optOrUndefined(record.authors?.ifEmpty { null }))
                }
            }

            bus.emit(ids.map { IllustCreated(it, IllustType.IMAGE) })

            return form.map { it.importId }.zip(ids).toMap()
        }else{
            emptyMap()
        }
    }

    /**
     * 创建新的collection。
     * @throws ResourceNotExist ("images", number[]) 给出的部分images不存在。给出不存在的image id列表
     */
    fun newCollection(illustIds: List<Int>, formDescription: String, formScore: Int?, formFavorite: Boolean?, formTagme: Illust.Tagme, specifyPartitionTime: LocalDate?): Int {
        if(illustIds.isEmpty()) throw be(ParamError("images"))
        val images = unfoldImages(illustIds, sorted = false)
        val (fileId, scoreFromSub, favorite, partitionTime, orderTime) = kit.getExportedPropsFromList(images, specifyPartitionTime)
        val (cachedBookIds, cachedFolderIds) = kit.getCachedBookAndFolderFromImages(images)

        val createTime = Instant.now()

        val id = data.db.insertAndGenerateKey(Illusts) {
            set(it.type, IllustModelType.COLLECTION)
            set(it.parentId, null)
            set(it.fileId, fileId)
            set(it.cachedChildrenCount, images.size)
            set(it.cachedBookCount, cachedBookIds.size)
            set(it.cachedBookIds, cachedBookIds)
            set(it.cachedFolderIds, cachedFolderIds)
            set(it.sourceDataId, null)
            set(it.sourceSite, null)
            set(it.sourceId, null)
            set(it.sortableSourceId, null)
            set(it.sourcePart, null)
            set(it.sourcePartName, null)
            set(it.description, formDescription)
            set(it.score, formScore)
            set(it.favorite, formFavorite ?: favorite)
            set(it.tagme, formTagme)
            set(it.exportedDescription, formDescription)
            set(it.exportedScore, formScore ?: scoreFromSub)
            set(it.partitionTime, partitionTime)
            set(it.orderTime, orderTime)
            set(it.createTime, createTime)
            set(it.updateTime, createTime)
        } as Int

        val verifyId = data.db.from(Illusts).select(max(Illusts.id).aliased("id")).first().getInt("id")
        if(verifyId != id) {
            throw RuntimeException("Illust insert failed. generatedKey is $id but queried verify id is $verifyId.")
        }

        updateSubImages(id, images, specifyPartitionTime)

        if(formFavorite != null) {
            data.db.update(Illusts) {
                where { it.parentId eq id }
                set(it.favorite, formFavorite)
            }
        }

        kit.refreshAllMeta(id, copyFromChildren = true)

        bus.emit(IllustCreated(id, IllustType.COLLECTION))
        images.forEach { bus.emit(IllustRelatedItemsUpdated(it.id, IllustType.IMAGE, collectionSot = true)) }

        return id
    }

    /**
     * 设置一个collection的image列表。
     */
    fun updateImagesInCollection(collectionId: Int, images: List<Illust>, specifyPartitionTime: LocalDate?, originScore: Int? = null) {
        val (fileId, scoreFromSub, favoriteFromSub, partitionTime, orderTime) = kit.getExportedPropsFromList(images, specifyPartitionTime)

        data.db.update(Illusts) {
            where { it.id eq collectionId }
            set(it.fileId, fileId)
            set(it.cachedChildrenCount, images.size)
            set(it.exportedScore, originScore ?: scoreFromSub)
            set(it.favorite, favoriteFromSub)
            set(it.partitionTime, partitionTime)
            set(it.orderTime, orderTime)
            set(it.updateTime, Instant.now())
        }

        val oldImageIds = updateSubImages(collectionId, images, specifyPartitionTime)

        kit.refreshAllMeta(collectionId, copyFromChildren = true)

        val imageIds = images.map { it.id }.toSet()
        val added = (imageIds - oldImageIds).toList()
        val deleted = (oldImageIds - imageIds).toList()
        bus.emit(IllustImagesChanged(collectionId, added, deleted))
        added.forEach { bus.emit(IllustRelatedItemsUpdated(it, IllustType.IMAGE, collectionSot = true)) }
        deleted.forEach { bus.emit(IllustRelatedItemsUpdated(it, IllustType.IMAGE, collectionSot = true)) }
    }

    /**
     * 设置一个image的sourceDataPath。仅包括path，不包括其他数据。
     */
    fun updateSourceDataOfImage(imageId: Int, sourceDataPath: SourceDataPath?, oldTagme: Illust.Tagme? = null) {
        val rowId = if(sourceDataPath != null) {
            sourceManager.checkSourceSite(sourceDataPath.sourceSite, sourceDataPath.sourceId, sourceDataPath.sourcePart, sourceDataPath.sourcePartName)
            sourceManager.validateAndCreateSourceDataIfNotExist(sourceDataPath.sourceSite, sourceDataPath.sourceId)
        }else{
            null
        }

        val tagme = oldTagme ?: data.db.from(Illusts).select(Illusts.tagme).where { Illusts.id eq imageId }.firstOrNull()?.get(Illusts.tagme)

        data.db.update(Illusts) {
            where { it.id eq imageId }
            set(it.sourceDataId, rowId)
            set(it.sourceSite, sourceDataPath?.sourceSite)
            set(it.sourceId, sourceDataPath?.sourceId)
            set(it.sortableSourceId, sourceDataPath?.sourceId?.toLongOrNull())
            set(it.sourcePart, sourceDataPath?.sourcePart)
            set(it.sourcePartName, sourceDataPath?.sourcePartName)
            if(appdata.setting.meta.autoCleanTagme && tagme != null && Illust.Tagme.SOURCE in tagme) set(it.tagme, tagme - Illust.Tagme.SOURCE)
        }

        bus.emit(IllustUpdated(imageId, IllustType.IMAGE, listUpdated = true))
    }

    /**
     * 删除项目。对于collection，它将被直接删除；对于image，它将接trash调用，送入已删除列表。
     * @param deleteCompletely 彻底删除。对于image，不送入已删除列表，而是直接删除。
     * @param deleteCollectionChildren 对于collection，删除它下属的所有image。
     * @param innerCalled 该方法内部递归调用时使用此参数。方法外部不应当使用。
     */
    fun delete(illust: Illust, deleteCompletely: Boolean = false, deleteCollectionChildren: Boolean = false, innerCalled: Boolean = false) {
        //对于IMAGE，将其移入Trash。不过在开启了deleteCompletely时不这么做
        if(illust.type != IllustModelType.COLLECTION && !deleteCompletely) {
            trashManager.trashImage(illust)
        }

        data.db.delete(Illusts) { it.id eq illust.id }
        if(illust.type != IllustModelType.COLLECTION) {
            //对于image，清除其在metaTag中的缓存计数
            data.db.update(Tags) {
                where { it.id inList data.db.from(Tags).innerJoin(IllustTagRelations, IllustTagRelations.tagId eq Tags.id).select(Tags.id).where { IllustTagRelations.illustId eq illust.id} }
                set(it.cachedCount, it.cachedCount minus 1)
            }
            data.db.update(Topics) {
                where { it.id inList data.db.from(Topics).innerJoin(IllustTopicRelations, IllustTopicRelations.topicId eq Topics.id).select(Topics.id).where { IllustTopicRelations.illustId eq illust.id} }
                set(it.cachedCount, it.cachedCount minus 1)
            }
            data.db.update(Authors) {
                where { it.id inList data.db.from(Authors).innerJoin(IllustAuthorRelations, IllustAuthorRelations.authorId eq Authors.id).select(Authors.id).where { IllustAuthorRelations.illustId eq illust.id} }
                set(it.cachedCount, it.cachedCount minus 1)
            }
        }
        data.db.delete(IllustTagRelations) { it.illustId eq illust.id }
        data.db.delete(IllustAuthorRelations) { it.illustId eq illust.id }
        data.db.delete(IllustTopicRelations) { it.illustId eq illust.id }
        data.db.delete(IllustAnnotationRelations) { it.illustId eq illust.id }

        //移除illust时，将此illust的关联组设置为空，这将同时移除所有的关联关系
        associateManager.setAssociatesOfIllust(illust.id, emptyList())

        if(illust.type != IllustModelType.COLLECTION) {
            //移除importRecord
            importManager.deleteByImageId(illust.id)
            //从所有book中移除并重导出
            bookManager.removeItemFromAllBooks(illust.id)
            //从所有folder中移除
            folderManager.removeItemFromAllFolders(illust.id)
            //对parent的导出处理
            if(illust.parentId != null && !innerCalled) processCollectionChildrenChanged(illust.parentId, -1)
            //如果开启了deleteCompletely，那么现在就要删除File
            if(deleteCompletely) fileManager.deleteFile(illust.fileId)

            bus.emit(IllustDeleted(illust.id, IllustType.IMAGE))
            if(illust.parentId != null && !innerCalled) bus.emit(IllustImagesChanged(illust.parentId, emptyList(), listOf(illust.id)))
        }else{
            //如果开启了deleteCollectionChildren，那么将删除其子项。删除子项的操作也响应deleteCompletely参数
            if(deleteCollectionChildren) {
                data.db.from(Illusts).select()
                    .where { Illusts.parentId eq illust.id }
                    .map { Illusts.createEntity(it) }
                    .forEach { delete(it, deleteCompletely = deleteCompletely, innerCalled = true) }
            }else{
                val children = data.db.from(Illusts).select(Illusts.id)
                    .where { Illusts.parentId eq illust.id }
                    .map { it[Illusts.id]!! }

                data.db.update(Illusts) {
                    where { it.parentId eq illust.id }
                    set(it.parentId, null)
                    set(it.type, IllustModelType.IMAGE)
                }

                children.forEach { bus.emit(IllustRelatedItemsUpdated(it, IllustType.IMAGE, collectionSot = true)) }
            }

            bus.emit(IllustDeleted(illust.id, IllustType.COLLECTION))
        }
    }

    /**
     * 批量编辑项目。
     */
    fun bulkUpdate(form: IllustBatchUpdateForm) {
        val records = data.db.sequenceOf(Illusts).filter { it.id inList form.target }.toList().also { records ->
            val targetSet = form.target.toSet()
            if(records.size < form.target.size) {
                throw be(ResourceNotExist("target", targetSet - records.map { it.id }.toSet()))
            }else if(records.any { it.parentId in targetSet }) {
                throw be(ResourceNotSuitable("target", records.filter { it.parentId in targetSet }))
            }
        }
        if(records.isEmpty()) return
        val (collections, images) = records.filterInto { it.type == IllustModelType.COLLECTION }
        val collectionIds by lazy { collections.asSequence().map { it.id }.toSet() }
        val childrenOfCollections by lazy { if(collections.isEmpty()) emptyList() else data.db.sequenceOf(Illusts).filter { it.parentId inList collectionIds }.toList() }

        //favorite
        form.favorite.alsoOpt { favorite ->
            //favorite的更新会直接更新image, collection以及collection children
            val allIds = form.target + childrenOfCollections.map { it.id }
            data.db.update(Illusts) {
                where { it.id inList allIds }
                set(it.favorite, favorite)
            }
        }

        //score
        form.score.alsoOpt { score ->
            if(score != null) {
                kit.validateScore(score)

                //在给出score的情况下直接设定所有score
                data.db.update(Illusts) {
                    where { it.id inList form.target }
                    set(it.score, score)
                    set(it.exportedScore, score)
                }
            }else{
                //在给出null的情况下，对于所有collection,计算children的其平均值
                val collectionScores = if(collections.isNotEmpty()) emptyMap() else data.db.from(Illusts)
                    .select(Illusts.parentId, count(Illusts.id).aliased("count"), avg(Illusts.score).aliased("score"))
                    .where { Illusts.parentId inList collectionIds }
                    .groupBy(Illusts.parentId)
                    .associate {
                        it[Illusts.parentId]!! to if(it.getInt("count") > 0) it.getDouble("score").roundToInt() else null
                    }
                //对于所有image,获得其parent的score
                val imageScores = if(images.isEmpty()) emptyMap() else data.db.from(Illusts)
                    .select(Illusts.id, Illusts.score)
                    .where { Illusts.id inList images.mapNotNull { it.parentId } }
                    .associate { it[Illusts.id]!! to it[Illusts.score] }
                //然后更新到db
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
            }
        }

        //description
        form.description.alsoOpt { description ->
            if(!description.isNullOrEmpty()) {
                //在给出description的情况下直接设定所有description
                data.db.update(Illusts) {
                    where { it.id inList form.target }
                    set(it.description, description)
                    set(it.exportedDescription, description)
                }
            }else{
                //在给出empty的情况下，对于所有collection仍直接设定；对于image,需要获得其parent的description
                if(collections.isNotEmpty()) {
                    data.db.update(Illusts) {
                        where { it.id inList collectionIds }
                        set(it.description, "")
                        set(it.exportedDescription, "")
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
        val metaResponses = mutableMapOf<Int, Pair<Illust.Tagme, Illust.Tagme>>()
        if(anyOpt(form.tags, form.topics, form.authors, form.mappingSourceTags)) {
            val mappings = form.mappingSourceTags.unwrapOrNull()?.let { sourceMappingManager.batchQuery(it) }?.associateBy { SourceTagPath(it.site, it.type, it.code) }

            //由于meta tag的更新实在复杂，不必在这里搞batch优化了，就挨个处理就好了
            for (illust in images) {
                val (tags, topics, authors) = if(mappings != null && illust.sourceDataId != null) {
                    //提取标签映射。查询sourceData对应的全部sourceTag，然后从mappings中取存在的那部分，最后按类别分类并与表单参数合并
                    val sourceTags = data.db.from(SourceTags)
                        .innerJoin(SourceTagRelations, (SourceTags.id eq SourceTagRelations.sourceTagId) and (SourceTagRelations.sourceDataId eq illust.sourceDataId))
                        .select(SourceTags.site, SourceTags.type, SourceTags.code)
                        .map { SourceTagPath(it[SourceTags.site]!!, it[SourceTags.type]!!, it[SourceTags.code]!!) }
                    val sourceTagMappings = sourceTags.mapNotNull { mappings[it] }
                    val mappedMetaTags = sourceTagMappings.flatMap { it.mappings }.map { it.metaTag }
                    val conflictTopics = mutableSetOf<Int>().letIf(appdata.setting.import.resolveConflictByParent) { conflictRet ->
                        val conflicts = sourceTagMappings.filter { m -> m.mappings.size >= 2 && m.mappings.all { it.metaTag is TopicSimpleRes && it.metaTag.type == TagTopicType.CHARACTER } }
                        if(conflicts.isNotEmpty()) {
                            val resolveConflictParents = mappedMetaTags.filterIsInstance<TopicSimpleRes>().filter { it.type == TagTopicType.IP || it.type == TagTopicType.COPYRIGHT }.map { it.id }
                            for (conflict in conflicts) {
                                //当一个sourceTag存在至少2个映射目标，目标都是character，且开启了resolveConflictByParent选项时，需要根据父标签限定选择其一
                                for (mapping in conflict.mappings) {
                                    val topic = mapping.metaTag as TopicSimpleRes
                                    var cur: Triple<Int, Int?, Int?>? = null
                                    var include = false
                                    do {
                                        //这里对每一个topic循环查询它的所有parent，当存在任意parent在resolveConflictParents集合内时，此映射有效
                                        cur = data.db.from(Topics)
                                            .select(Topics.id, Topics.parentId, Topics.parentRootId)
                                            .where { Topics.id eq (cur?.second ?: topic.id) }
                                            .map { Triple(it[Topics.id]!!, it[Topics.parentId], it[Topics.parentRootId]) }
                                            .firstOrNull()
                                        if(cur != null && (cur.second in resolveConflictParents || cur.third in resolveConflictParents)) {
                                            include = true
                                            break
                                        }
                                    } while (cur?.second != null)
                                    if(!include) conflictRet.add(topic.id)
                                }
                            }
                        }
                        conflictRet
                    }

                    val mappedTags = mappedMetaTags.filterIsInstance<TagSimpleRes>().map { it.id }
                    val mappedTopics = mappedMetaTags.filterIsInstance<TopicSimpleRes>().map { it.id } - conflictTopics
                    val mappedAuthors = mappedMetaTags.filterIsInstance<AuthorSimpleRes>().map { it.id }

                    val tags = if(mappedTags.isNotEmpty()) optOf((form.tags.unwrapOr { emptyList() } + mappedTags).distinct()) else form.tags
                    val topics = if(mappedTopics.isNotEmpty()) optOf((form.topics.unwrapOr { emptyList() } + mappedTopics).distinct()) else form.topics
                    val authors = if(mappedAuthors.isNotEmpty()) optOf((form.authors.unwrapOr { emptyList() } + mappedAuthors).distinct()) else form.authors
                    Triple(tags, topics, authors)
                }else{
                    Triple(form.tags, form.topics, form.authors)
                }

                val metaResponse = when (form.tagUpdateMode) {
                    IllustBatchUpdateForm.TagUpdateMode.OVERRIDE -> kit.updateMeta(illust.id, newTags = tags, newAuthors = authors, newTopics = topics, copyFromParent = illust.parentId)
                    IllustBatchUpdateForm.TagUpdateMode.APPEND -> kit.appendMeta(illust.id, appendTags = tags.unwrapOr { emptyList() }, appendAuthors = authors.unwrapOr { emptyList() }, appendTopics = topics.unwrapOr { emptyList() }, isCollection = false)
                    IllustBatchUpdateForm.TagUpdateMode.REMOVE -> {
                        kit.removeMeta(illust.id, removeTags = tags.unwrapOr { emptyList() }, removeAuthors = authors.unwrapOr { emptyList() }, removeTopics = topics.unwrapOr { emptyList() }, copyFromParent = illust.parentId)
                        Illust.Tagme.EMPTY
                    }
                }

                if(metaResponse != Illust.Tagme.EMPTY) metaResponses[illust.id] = metaResponse to illust.tagme
            }
            for (illust in collections) {
                val metaResponse = when (form.tagUpdateMode) {
                    IllustBatchUpdateForm.TagUpdateMode.OVERRIDE -> kit.updateMeta(illust.id, newTags = form.tags.elseOr { emptyList() }, newAuthors = form.authors.elseOr { emptyList() }, newTopics = form.topics.elseOr { emptyList() }, copyFromChildren = true)
                    IllustBatchUpdateForm.TagUpdateMode.APPEND -> kit.appendMeta(illust.id, appendTags = form.tags.unwrapOr { emptyList() }, appendAuthors = form.authors.unwrapOr { emptyList() }, appendTopics = form.topics.unwrapOr { emptyList() }, isCollection = true)
                    IllustBatchUpdateForm.TagUpdateMode.REMOVE -> {
                        kit.removeMeta(illust.id, removeTags = form.tags.unwrapOr { emptyList() }, removeAuthors = form.authors.unwrapOr { emptyList() }, removeTopics = form.topics.unwrapOr { emptyList() }, copyFromChildren = true)
                        Illust.Tagme.EMPTY
                    }
                }
                if(metaResponse != Illust.Tagme.EMPTY) metaResponses[illust.id] = metaResponse to illust.tagme
            }
        }

        //tagme
        if(form.tagme.isPresent) {
            data.db.update(Illusts) {
                where { it.id inList form.target }
                set(it.tagme, form.tagme.value)
            }
        }else if(metaResponses.isNotEmpty()) {
            data.db.batchUpdate(Illusts) {
                for ((recordId, pair) in metaResponses) {
                    val (minusTagme, originTagme) = pair
                    item {
                        where { it.id eq recordId }
                        set(it.tagme, originTagme - minusTagme)
                    }
                }
            }
        }

        //partition time
        fun setPartitionTime(partitionTime: LocalDate) {
            //tips: 绕过标准导出流程进行更改。对于collection,直接修改它及它全部children的此属性
            val children = childrenOfCollections.filter { it.partitionTime != partitionTime }.map { Pair(it.id, it.partitionTime) }

            data.db.update(Illusts) {
                where { it.id inList (children.map { (id, _) -> id } + form.target) }
                set(it.partitionTime, partitionTime)
            }
        }
        form.partitionTime.alsoOpt(::setPartitionTime)

        //order time
        val orderTimeSeq by lazy {
            val children = childrenOfCollections.map { Triple(it.id, it.parentId, it.orderTime) }

            records.asSequence()
                .sortedBy { it.orderTime }
                .flatMap {
                    if(it.type == IllustModelType.COLLECTION) {
                        children.filter { (_, parentId, _) -> parentId == it.id }.asSequence().sortedBy { (_, _, t) -> t }
                    }else{
                        sequenceOf(Triple(it.id, it.parentId, it.orderTime))
                    }
                }
                .toList()
        }
        fun setOrderTimeBySeq(newOrderTimeSeq: List<Long>) {
            if(newOrderTimeSeq.size != orderTimeSeq.size) throw RuntimeException("newOrderTimeSeq is not suitable to seq.")

            if(orderTimeSeq.isNotEmpty()) {
                //将orderTime序列的值依次赋值给项目序列中的每一项
                data.db.batchUpdate(Illusts) {
                    orderTimeSeq.forEachIndexed { i, (id, _, _) ->
                        item {
                            where { it.id eq id }
                            set(it.partitionTime, newOrderTimeSeq[i].toInstant().toPartitionDate(appdata.setting.server.timeOffsetHour))
                            set(it.orderTime, newOrderTimeSeq[i])
                        }
                    }
                }
            }

            if(collections.isNotEmpty()) {
                //根据项目序列和orderTime序列，推算每一个parent collection应获得的orderTime
                val collectionValues = orderTimeSeq.zip(newOrderTimeSeq) { (id, p, _), ot -> Triple(id, p, ot) }
                    .filter { (_, p, _) -> p != null }
                    .groupBy { (_, p, _) -> p!! }
                    .mapValues { (_, values) -> values.minOf { (_, _, t) -> t } }
                if(collectionValues.isNotEmpty()) {
                    data.db.batchUpdate(Illusts) {
                        for ((id, ot) in collectionValues) {
                            item {
                                where { it.id eq id }
                                set(it.partitionTime, ot.toInstant().toPartitionDate(appdata.setting.server.timeOffsetHour))
                                set(it.orderTime, ot)
                            }
                        }
                    }
                }
            }
        }
        fun setOrderTimeByRange(begin: Instant, end: Instant? = null, excludeBeginAndEnd: Boolean = false) {
            //找出所有image及collection的children，按照原有orderTime顺序排序，并依次计算新orderTime。排序时相同parent的children保持相邻
            //对于collection，绕过标准导出流程进行更改。直接按照计算结果修改collection的orderTime，且无需导出，因为orderTime并未变化

            val values = if(orderTimeSeq.size > 1) {
                val beginMs = begin.toEpochMilli()
                val endMs = if(end != null) {
                    end.toEpochMilli().apply {
                        if(end < begin) {
                            throw be(ParamError("orderTimeEnd"))
                        }
                    }
                }else{
                    //若未给出endTime，则尝试如下策略：
                    //如果beginTime距离now很近(每个项的空间<2s)，那么将now作为endTime
                    //但如果beginTime过近(每个项空间<10ms)，或超过了now，或距离过远，那么以1s为单位间隔生成endTime
                    val nowMs = Instant.now().toEpochMilli()
                    if(nowMs < beginMs + (orderTimeSeq.size - 1) * 2000 && nowMs > beginMs + (orderTimeSeq.size - 1) * 10) {
                        nowMs
                    }else{
                        beginMs + (orderTimeSeq.size - 1) * 1000
                    }
                }

                //从begin开始，通过每次迭代step的步长长度来获得整个seq序列
                if(excludeBeginAndEnd) {
                    //如果开启了exclude，则会去掉两个端点，因此step的计算项数+2，初始value额外增加了一个step的值
                    val step = (endMs - beginMs) / (orderTimeSeq.size + 1)
                    var value = beginMs + step
                    orderTimeSeq.indices.map { value.also { value += step } }
                }else{
                    val step = (endMs - beginMs) / (orderTimeSeq.size - 1)
                    var value = beginMs
                    orderTimeSeq.indices.map { value.also { value += step } }
                }
            }else if(end != null && excludeBeginAndEnd) {
                //只有一项，但指定了end且开启了exclude参数，那么应该取begin和end的中点值
                listOf((begin.toEpochMilli() + end.toEpochMilli()) / 2)
            }else{
                //只有一项，且没有指定end或没有开启exclude参数，那么取begin即可
                listOf(begin.toEpochMilli())
            }

            setOrderTimeBySeq(values)
        }
        //insert by list
        form.orderTimeList.alsoOpt { orderTimeList -> setOrderTimeBySeq(orderTimeList.map { it.toEpochMilli() }) }
        //insert between instants
        form.orderTimeBegin.alsoOpt { orderTimeBegin -> setOrderTimeByRange(orderTimeBegin, form.orderTimeEnd.unwrapOrNull(), form.orderTimeExclude) }
        //insert between illusts
        form.timeInsertBegin.alsoOpt { beginId ->
            if(form.timeInsertEnd.isPresent) {
                //如果指定了end，将当前所有项插入到指定的两项中间
                //如果begin端点是集合，那么会选取集合中在end之前的最大的子项的orderTime；如果end端点是集合，那么使用集合的orderTime即可
                //需要注意的是如果两端点不在一个时间分区，则会靠近其中一边，变成下述情况的那种排布方式
                //如果两端点时间一致，则变成第三种情况的排布方式
                val a = data.db.from(Illusts).select(Illusts.type, Illusts.orderTime)
                    .where { Illusts.id eq beginId }.firstOrNull()
                    ?.let { Pair(it[Illusts.type]!!, it[Illusts.orderTime]!!) }
                    ?: throw be(ResourceNotExist("timeInsertBegin", beginId))
                val b = data.db.from(Illusts).select(Illusts.type, Illusts.orderTime)
                    .where { Illusts.id eq form.timeInsertEnd.value }.firstOrNull()
                    ?.let { Pair(it[Illusts.type]!!, it[Illusts.orderTime]!!) }
                    ?: throw be(ResourceNotExist("timeInsertEnd", beginId))
                if(a.second == b.second) {
                    setOrderTimeByRange(a.second.toInstant(), a.second.toInstant())
                    return@alsoOpt
                }
                val begin = if(a.second < b.second && a.first != IllustModelType.COLLECTION) a.second else if(a.second > b.second && b.first !== IllustModelType.COLLECTION) b.second else {
                    data.db.from(Illusts)
                        .select(max(Illusts.orderTime).aliased("ord"))
                        .where { (Illusts.parentId eq if(a.second < b.second) beginId else form.timeInsertEnd.value) and (Illusts.orderTime less if(a.second < b.second) b.second else a.second) }
                        .firstOrNull()?.getLong("ord") ?: if(a.second < b.second) a.second else b.second
                }
                val end = if(a.second < b.second) b.second else a.second

                val orderTimeBegin: Long
                val orderTimeEnd: Long
                if(end.toInstant().toPartitionDate(appdata.setting.server.timeOffsetHour) != begin.toInstant().toPartitionDate(appdata.setting.server.timeOffsetHour)) {
                    val targetOrderTimes = orderTimeSeq.map { (_, _, ot) -> ot }
                    val max = targetOrderTimes.max()
                    val min = targetOrderTimes.min()
                    val durationToBegin = abs(begin - max).coerceAtMost(abs(begin - min))
                    val durationToEnd = abs(end - max).coerceAtMost(abs(end - min))
                    if(durationToBegin <= durationToEnd) {
                        orderTimeBegin = begin
                        orderTimeEnd = begin + (orderTimeSeq.size + 1) * 1000
                    }else{
                        orderTimeBegin = end - (orderTimeSeq.size + 1) * 1000
                        orderTimeEnd = end
                    }
                }else{
                    orderTimeBegin = begin
                    orderTimeEnd = end
                }
                setOrderTimeByRange(orderTimeBegin.toInstant(), orderTimeEnd.toInstant(), excludeBeginAndEnd = true)

            }else if(form.timeInsertAt != null) {
                //如果未指定end但指定了at，那么按at的值behind/after决定是插入到begin项目的之前还是之后
                //端点是集合时的选取逻辑同上；所选项在指定方向上以1s为间隔排布
                val a = data.db.from(Illusts).select(Illusts.type, Illusts.orderTime)
                    .where { Illusts.id eq beginId }.firstOrNull()
                    ?.let { Pair(it[Illusts.type]!!, it[Illusts.orderTime]!!) }
                    ?: throw be(ResourceNotExist("timeInsertBegin", beginId))

                val orderTimeBegin: Long
                val orderTimeEnd: Long
                when (form.timeInsertAt) {
                    "behind" -> {
                        orderTimeBegin = a.second - (orderTimeSeq.size + 1) * 1000
                        orderTimeEnd = a.second
                    }
                    "after" -> {
                        orderTimeBegin = if(a.first != IllustModelType.COLLECTION) a.second else {
                            data.db.from(Illusts)
                                .select(max(Illusts.orderTime).aliased("ord"))
                                .where { Illusts.parentId eq beginId }
                                .firstOrNull()?.getLong("ord") ?: a.second
                        }
                        orderTimeEnd = orderTimeBegin + (orderTimeSeq.size + 1) * 1000
                    }
                    else -> throw be(ParamError("timeInsertAt"))
                }
                setOrderTimeByRange(orderTimeBegin.toInstant(), orderTimeEnd.toInstant(), excludeBeginAndEnd = true)

            }else{
                //如果都没有指定，那么插入的时间点与begin完全相同
                val orderTime = data.db.from(Illusts).select(Illusts.orderTime)
                    .where { Illusts.id eq beginId }.firstOrNull()
                    ?.let { it[Illusts.orderTime]!!.toInstant() }
                    ?: throw be(ResourceNotExist("timeInsertBegin", beginId))
                setOrderTimeByRange(orderTime, orderTime)
            }
        }

        //action
        if(form.action != null) {
            when(form.action) {
                IllustBatchUpdateForm.Action.SET_PARTITION_TIME_TODAY -> setPartitionTime(LocalDate.now())
                IllustBatchUpdateForm.Action.SET_PARTITION_TIME_MOST -> setPartitionTime(records.map { it.partitionTime }.mostCount())
                IllustBatchUpdateForm.Action.SET_PARTITION_TIME_EARLIEST -> setPartitionTime(records.minOf { it.partitionTime })
                IllustBatchUpdateForm.Action.SET_PARTITION_TIME_LATEST -> setPartitionTime(records.maxOf { it.partitionTime })
                IllustBatchUpdateForm.Action.SET_ORDER_TIME_UNIFORMLY -> setOrderTimeByRange(orderTimeSeq.minOf { (_, _, ot) -> ot }.toInstant(), orderTimeSeq.maxOf { (_, _, ot) -> ot }.toInstant())
                IllustBatchUpdateForm.Action.SET_ORDER_TIME_REVERSE -> setOrderTimeBySeq(orderTimeSeq.map { (_, _, ot) -> ot }.asReversed())
                IllustBatchUpdateForm.Action.SET_ORDER_TIME_NOW -> {
                    val now = Instant.now()
                    setOrderTimeByRange(now, now)
                }
                IllustBatchUpdateForm.Action.SET_ORDER_TIME_MOST -> {
                    //从所有image/children中找出项最多的orderTimeDate，在这个范围内找出最大值和最小值，然后按时间端点设置所有项
                    val instants = orderTimeSeq.map { (_, _, ot) -> ot to ot.toInstant().toPartitionDate(appdata.setting.server.timeOffsetHour) }
                    val date = instants.map { (_, d) -> d }.mostCount()
                    val instantsInThisDay = instants.filter { (_, d) -> d == date }.map { (i, _) -> i }
                    val min = instantsInThisDay.min().toInstant()
                    val max = instantsInThisDay.max().toInstant()
                    setOrderTimeByRange(min, max)
                }
                IllustBatchUpdateForm.Action.SET_ORDER_TIME_BY_SOURCE_ID -> {
                    //为了按照来源顺序排序，需要首先取出一部分sourceData的数据，包括publishTime
                    val publishTimeMap = data.db.from(SourceDatas)
                        .select(SourceDatas.id, SourceDatas.publishTime)
                        .where { (SourceDatas.id inList (images.mapNotNull { it.sourceDataId } + childrenOfCollections.mapNotNull { it.sourceDataId })) and (SourceDatas.publishTime.isNotNull()) }
                        .associateBy({ it[SourceDatas.id]!! }) { it[SourceDatas.publishTime]!! }
                    //将所有image/children按source sortable path排序，然后把所有的orderTime取出排序，依次选取
                    val sortedIds = (images + childrenOfCollections)
                        .map { Pair(it.id, if(it.sourceSite == null) null else SourceSortablePath(it.sourceSite, it.sortableSourceId, it.sourcePart, publishTimeMap[it.sourceDataId])) }
                        .sortedBy { (_, p) -> p }
                        .map { (id, _) -> id }
                    val sortedTimes = orderTimeSeq.map { (_, _, ot) -> ot }.sorted()
                    val idToTimes = sortedIds.zip(sortedTimes).toMap()
                    val seq = orderTimeSeq.map { (id, _, _) -> idToTimes[id]!! }
                    setOrderTimeBySeq(seq)
                }
                IllustBatchUpdateForm.Action.SET_ORDER_TIME_BY_BOOK_ORDINAL -> {
                    //将所有images按在book中的顺序排序，然后把所有的orderTime取出来，依次选取
                    if(form.actionBy == null) throw be(ParamRequired("actionBy"))
                    val ids = orderTimeSeq.map { (id, _, _) -> id }
                    val sortedIds = data.db.from(BookImageRelations)
                        .select(BookImageRelations.imageId)
                        .where { BookImageRelations.bookId eq form.actionBy and (BookImageRelations.imageId inList ids) }
                        .orderBy(BookImageRelations.ordinal.asc())
                        .map { it[BookImageRelations.imageId]!! }
                    if(sortedIds.size < ids.size) throw be(Reject("Some images (${(ids - sortedIds.toSet()).joinToString(", ")}) not in book ${form.actionBy}."))
                    val sortedTimes = orderTimeSeq.map { (_, _, ot) -> ot }.sorted()
                    val idToTimes = sortedIds.zip(sortedTimes).toMap()
                    val seq = orderTimeSeq.map { (id, _, _) -> idToTimes[id]!! }
                    setOrderTimeBySeq(seq)
                }
                IllustBatchUpdateForm.Action.SET_ORDER_TIME_BY_FOLDER_ORDINAL -> {
                    //将所有images按在folder中的顺序排序，然后把所有的orderTime取出来，依次选取
                    if(form.actionBy == null) throw be(ParamRequired("actionBy"))
                    val ids = orderTimeSeq.map { (id, _, _) -> id }
                    val sortedIds = data.db.from(FolderImageRelations)
                        .select(FolderImageRelations.imageId)
                        .where { FolderImageRelations.folderId eq form.actionBy and (FolderImageRelations.imageId inList ids) }
                        .orderBy(FolderImageRelations.ordinal.asc())
                        .map { it[FolderImageRelations.imageId]!! }
                    if(sortedIds.size < ids.size) throw be(Reject("Some images (${(ids - sortedIds.toSet()).joinToString(", ")}) not in folder ${form.actionBy}."))
                    val sortedTimes = orderTimeSeq.map { (_, _, ot) -> ot }.sorted()
                    val idToTimes = sortedIds.zip(sortedTimes).toMap()
                    val seq = orderTimeSeq.map { (id, _, _) -> idToTimes[id]!! }
                    setOrderTimeBySeq(seq)
                }
            }
        }

        val timeSot = anyOpt(form.partitionTime, form.orderTimeList, form.orderTimeBegin, form.timeInsertBegin) || form.action != null
        val listUpdated = anyOpt(form.favorite, form.score, form.tagme, form.orderTimeList, form.orderTimeBegin, form.timeInsertBegin) || form.action != null
        for (record in records) {
            val thisMetaTagSot = metaResponses[record.id]?.first != Illust.Tagme.EMPTY
            val thisDetailUpdated = listUpdated || thisMetaTagSot || anyOpt(form.description, form.partitionTime)
            if(listUpdated || thisDetailUpdated) {
                //tips: 此处使用了偷懒的手法。并没有对受partition/orderTime变更影响的children进行处理
                bus.emit(IllustUpdated(
                    record.id, record.type.toIllustType(),
                    listUpdated = listUpdated,
                    detailUpdated = true,
                    metaTagSot = thisMetaTagSot,
                    scoreSot = form.score.isPresent,
                    descriptionSot = form.description.isPresent,
                    favoriteSot = form.favorite.isPresent,
                    timeSot = timeSot))
            }
        }
    }

    /**
     * 复制属性。
     * @throws ResourceNotExist ("from" | "to", number) 源或目标不存在
     * @throws ResourceNotSuitable ("from" | "to", number) 源或目标类型不适用，不能使用集合
     */
    fun cloneProps(fromIllustId: Int, toIllustId: Int, props: ImagePropsCloneForm.Props, merge: Boolean, deleteFrom: Boolean): Pair<Int?, List<Int>?> {
        val fromIllust = data.db.sequenceOf(Illusts).firstOrNull { it.id eq fromIllustId } ?: throw be(ResourceNotExist("from", fromIllustId))
        val toIllust = data.db.sequenceOf(Illusts).firstOrNull { it.id eq toIllustId } ?: throw be(ResourceNotExist("to", toIllustId))
        if(fromIllust.type == IllustModelType.COLLECTION) throw be(ResourceNotSuitable("from", fromIllustId))
        if(toIllust.type == IllustModelType.COLLECTION) throw be(ResourceNotSuitable("to", toIllustId))
        val ret = cloneProps(fromIllust, toIllust, props, merge)

        if(deleteFrom) {
            delete(fromIllust)
        }

        return ret
    }

    /**
     * 复制属性。
     * @return (newCollectionId, newBookIds) 返回toIllust新加入的collection和book。
     */
    private fun cloneProps(fromIllust: Illust, toIllust: Illust, props: ImagePropsCloneForm.Props, merge: Boolean): Pair<Int?, List<Int>?> {
        //根据是否更改了parent，有两种不同的处理路径
        val parentChanged = props.collection && fromIllust.parentId != toIllust.parentId
        val newParent = if(parentChanged && fromIllust.parentId != null) data.db.sequenceOf(Illusts).first { (it.id eq fromIllust.parentId) and (it.type eq IllustModelType.COLLECTION) } else null
        val parentId = if(parentChanged) toIllust.parentId else fromIllust.parentId

        if(parentChanged || props.favorite || props.tagme || props.score || props.description || props.orderTime || props.partitionTime || props.source) {
            data.db.update(Illusts) {
                where { it.id eq toIllust.id }
                if(parentChanged) {
                    set(it.parentId, newParent?.id)
                    set(it.type, if(newParent != null) IllustModelType.IMAGE_WITH_PARENT else IllustModelType.IMAGE)
                    set(it.exportedScore, if(props.score) { if(merge) { fromIllust.score ?: toIllust.score }else{ fromIllust.score } }else{ toIllust.score } ?: newParent?.score)
                    set(it.exportedDescription, if(props.description) { if(merge) { fromIllust.description.ifEmpty { toIllust.description } }else{ fromIllust.description } }else{ toIllust.description }.ifEmpty { newParent?.description ?: "" })
                }else{
                    if(props.score) set(it.exportedScore, if(merge) { fromIllust.score ?: toIllust.score }else{ fromIllust.score })
                    if(props.description) set(it.exportedDescription, if(merge) { fromIllust.description.ifEmpty { toIllust.description } }else{ fromIllust.description })
                }
                if(props.favorite) set(it.favorite, if(merge) { fromIllust.favorite || toIllust.favorite }else{ fromIllust.favorite })
                if(props.tagme) set(it.tagme, if(merge) { fromIllust.tagme + toIllust.tagme }else{ fromIllust.tagme })
                if(props.score) set(it.score, if(merge) { fromIllust.score ?: toIllust.score }else{ fromIllust.score })
                if(props.description) set(it.description, if(merge) { fromIllust.description.ifEmpty { toIllust.description } }else{ fromIllust.description })
                if(props.orderTime) set(it.orderTime, fromIllust.orderTime)
                if(props.partitionTime && fromIllust.partitionTime != toIllust.partitionTime) {
                    set(it.partitionTime, fromIllust.partitionTime)
                }

                if(props.source) {
                    set(it.sourceSite, fromIllust.sourceSite)
                    set(it.sourceId, fromIllust.sourceId)
                    set(it.sortableSourceId, fromIllust.sortableSourceId)
                    set(it.sourcePart, fromIllust.sourcePart)
                    set(it.sourcePartName, fromIllust.sourcePartName)
                    set(it.sourceDataId, fromIllust.sourceDataId)
                }
            }
        }

        if(parentChanged) {
            //刷新新旧parent的时间&封面、导出属性
            val now = Instant.now()
            if(newParent != null) processCollectionChildrenChanged(newParent.id, 1, now)
            if(toIllust.parentId != null) processCollectionChildrenChanged(toIllust.parentId, -1, now)
        }

        if(props.metaTags) {
            val tagIds = data.db.from(IllustTagRelations).select(IllustTagRelations.tagId)
                .where { (IllustTagRelations.illustId eq fromIllust.id) and IllustTagRelations.isExported.not() }
                .map { it[IllustTagRelations.tagId]!! }
            val topicIds = data.db.from(IllustTopicRelations).select(IllustTopicRelations.topicId)
                .where { (IllustTopicRelations.illustId eq fromIllust.id) and IllustTopicRelations.isExported.not() }
                .map { it[IllustTopicRelations.topicId]!! }
            val authorIds = data.db.from(IllustAuthorRelations).select(IllustAuthorRelations.authorId)
                .where { (IllustAuthorRelations.illustId eq fromIllust.id) and IllustAuthorRelations.isExported.not() }
                .map { it[IllustAuthorRelations.authorId]!! }
            if(merge) {
                val originTagIds = data.db.from(IllustTagRelations).select(IllustTagRelations.tagId)
                    .where { (IllustTagRelations.illustId eq toIllust.id) and IllustTagRelations.isExported.not() }
                    .map { it[IllustTagRelations.tagId]!! }
                val originTopicIds = data.db.from(IllustTopicRelations).select(IllustTopicRelations.topicId)
                    .where { (IllustTopicRelations.illustId eq toIllust.id) and IllustTopicRelations.isExported.not() }
                    .map { it[IllustTopicRelations.topicId]!! }
                val originAuthorIds = data.db.from(IllustAuthorRelations).select(IllustAuthorRelations.authorId)
                    .where { (IllustAuthorRelations.illustId eq toIllust.id) and IllustAuthorRelations.isExported.not() }
                    .map { it[IllustAuthorRelations.authorId]!! }

                kit.updateMeta(toIllust.id,
                    optOf((tagIds + originTagIds).distinct()),
                    optOf((topicIds + originTopicIds).distinct()),
                    optOf((authorIds + originAuthorIds).distinct()),
                    copyFromParent = parentId)
            }else{
                kit.updateMeta(toIllust.id, optOf(tagIds), optOf(topicIds), optOf(authorIds), copyFromParent = parentId)
            }
        }

        if(props.associate) {
            associateManager.copyAssociatesFromIllust(toIllust.id, fromIllust.id, merge)
        }

        val newBooks = if(props.books) {
            val books = data.db.from(BookImageRelations)
                .select(BookImageRelations.bookId, BookImageRelations.ordinal)
                .where { BookImageRelations.imageId eq fromIllust.id }
                .map { Pair(it[BookImageRelations.bookId]!!, it[BookImageRelations.ordinal]!! + 1 /* +1 使新项插入到旧项后面 */) }

            if(merge) {
                val existsBooks = data.db.from(BookImageRelations)
                    .select(BookImageRelations.bookId)
                    .where { BookImageRelations.imageId eq toIllust.id }
                    .map { it[BookImageRelations.bookId]!! }
                    .toSet()

                val newBooks = books.filter { (id, _) -> id !in existsBooks }
                if(newBooks.isNotEmpty()) {
                    bookManager.addItemInBooks(toIllust.id, newBooks)
                    newBooks.map { (id, _) -> id }
                }else null
            }else{
                bookManager.removeItemFromAllBooks(toIllust.id)
                bookManager.addItemInBooks(toIllust.id, books)
                books.map { (id, _) -> id }
            }
        }else null

        if(props.folders) {
            val folders = data.db.from(FolderImageRelations)
                .select(FolderImageRelations.folderId, FolderImageRelations.ordinal)
                .where { FolderImageRelations.imageId eq fromIllust.id }
                .map { Pair(it[FolderImageRelations.folderId]!!, it[FolderImageRelations.ordinal]!! + 1 /* +1 使新项插入到旧项后面 */) }

            if(merge) {
                val existsFolders = data.db.from(FolderImageRelations)
                    .select(FolderImageRelations.folderId)
                    .where { FolderImageRelations.imageId eq toIllust.id }
                    .map { it[FolderImageRelations.folderId]!! }
                    .toSet()

                val newFolders = folders.filter { (id, _) -> id !in existsFolders }
                if(newFolders.isNotEmpty()) folderManager.addItemInFolders(toIllust.id, newFolders)
            }else{
                folderManager.removeItemFromAllFolders(toIllust.id)
                folderManager.addItemInFolders(toIllust.id, folders)
            }
        }

        val listUpdated = parentChanged || props.favorite || props.score || props.orderTime || props.source
        val detailUpdated = props.favorite || props.score || props.orderTime || props.description || props.partitionTime || props.metaTags
        if(listUpdated || detailUpdated) {
            bus.emit(IllustUpdated(toIllust.id, toIllust.type.toIllustType(),
                listUpdated = listUpdated,
                detailUpdated = detailUpdated,
                metaTagSot = props.metaTags,
                descriptionSot = props.description,
                scoreSot = props.score,
                favoriteSot = props.favorite,
                timeSot = props.orderTime || props.partitionTime
            ))
        }
        if(props.associate || props.books || props.folders || parentChanged) {
            bus.emit(IllustRelatedItemsUpdated(toIllust.id, toIllust.type.toIllustType(), associateSot = props.associate, bookUpdated = props.books, folderUpdated = props.folders, collectionSot = parentChanged))
        }
        if(props.source) {
            bus.emit(IllustSourceDataUpdated(toIllust.id))
        }
        if(parentChanged) {
            if(newParent != null) bus.emit(IllustImagesChanged(newParent.id, listOf(toIllust.id), emptyList()))
            if(toIllust.parentId != null) bus.emit(IllustImagesChanged(toIllust.parentId, emptyList(), listOf(toIllust.id)))
        }

        return Pair(newParent?.id, newBooks)
    }

    /**
     * 应用images列表，设置images的parent为当前collection，同时处理重导出关系。
     * 对于移入/移除当前集合的项，对其属性进行重导出；对于被移出的旧parent，也对其进行处理。
     * @throws ResourceNotExist ("specifyPartitionTime", LocalDate) 在指定的时间分区下没有存在的图像
     * @return oldImageIds
     */
    private fun updateSubImages(collectionId: Int, images: List<Illust>, specifyPartitionTime: LocalDate?): Set<Int> {
        val imageIds = images.map { it.id }.toSet()
        val oldImageIds = data.db.from(Illusts).select(Illusts.id)
            .where { Illusts.parentId eq collectionId }
            .map { it[Illusts.id]!! }
            .toSet()

        //处理移出项，修改它们的type/parentId，并视情况执行重新导出
        val deleteIds = oldImageIds - imageIds
        data.db.update(Illusts) {
            where { it.id inList deleteIds }
            set(it.type, IllustModelType.IMAGE)
            set(it.parentId, null)
        }

        //处理移入项，修改它们的type/parentId，并视情况执行重新导出
        val addIds = imageIds - oldImageIds
        data.db.update(Illusts) {
            where { it.id inList addIds }
            set(it.parentId, collectionId)
            set(it.type, IllustModelType.IMAGE_WITH_PARENT)
        }

        //若开启相关选项，则需要对排序时间做整理。当存在不在指定分区的图像时，将它们集中到指定分区内
        if(appdata.setting.meta.centralizeCollection && specifyPartitionTime != null) {
            val (specifiedImages, outsideImages) = images.filterInto { it.partitionTime == specifyPartitionTime }
            if(outsideImages.isNotEmpty()) {
                if(specifiedImages.isEmpty()) throw be(ResourceNotExist("specifyPartitionTime", specifyPartitionTime))
                val min = specifiedImages.minOf { it.orderTime }
                val max = specifiedImages.maxOf { it.orderTime }
                val step = (max - min) / (images.size - 1)
                val values = images.indices.map { index -> min + step * index }
                data.db.batchUpdate(Illusts) {
                    images.sortedBy { it.orderTime }.zip(values).forEach { (illust, ot) ->
                        item {
                            where { it.id eq illust.id }
                            set(it.orderTime, ot)
                            set(it.partitionTime, specifyPartitionTime)
                        }
                    }
                }
            }
        }

        //这些image有旧的parent，需要对旧parent做重新导出
        val now = Instant.now()
        images.asSequence()
            .filter { it.id in addIds && it.parentId != null && it.parentId != collectionId }
            .groupBy { it.parentId!! }
            .forEach { (parentId, images) ->
                processCollectionChildrenChanged(parentId, -images.size, now)
                bus.emit(IllustImagesChanged(parentId, emptyList(), images.map { it.id }))
            }

        return oldImageIds
    }

    /**
     * 由于向collection加入或删除了项，因此需要处理所有属性的重导出，包括firstCover, count, partitionTime, orderTime, updateTime。
     * 这个函数是在变化已经发生后，处理关系使用的，而且必须同步处理。
     */
    fun processCollectionChildrenChanged(collectionId: Int, changedCount: Int, updateTime: Instant? = null) {
        val children = data.db.from(Illusts)
            .select(Illusts.fileId, Illusts.partitionTime, Illusts.orderTime, Illusts.favorite)
            .where { Illusts.parentId eq collectionId }
            .map { Tuple4(it[Illusts.fileId]!!, it[Illusts.partitionTime]!!, it[Illusts.orderTime]!!, it[Illusts.favorite]!!) }

        if(children.isNotEmpty()) {
            val fileId = children.minBy { it.f3 }.f1
            val partitionTime = children.asSequence().map { it.f2 }.groupBy { it }.maxBy { it.value.size }.key
            val orderTime = children.filter { it.f2 == partitionTime }.minOf { it.f3 }
            val favorite = children.any { it.f4 }

            data.db.update(Illusts) {
                where { it.id eq collectionId }
                set(it.fileId, fileId)
                set(it.favorite, favorite)
                set(it.partitionTime, partitionTime)
                set(it.orderTime, orderTime)
                set(it.cachedChildrenCount, it.cachedChildrenCount plus changedCount)
                set(it.updateTime, updateTime ?: Instant.now())
            }
        }else{
            //此collection已经没有项了，将其删除
            data.db.delete(Illusts) { it.id eq collectionId }
            data.db.delete(IllustTagRelations) { it.illustId eq collectionId }
            data.db.delete(IllustAuthorRelations) { it.illustId eq collectionId }
            data.db.delete(IllustTopicRelations) { it.illustId eq collectionId }
            data.db.delete(IllustAnnotationRelations) { it.illustId eq collectionId }

            bus.emit(IllustDeleted(collectionId, IllustType.COLLECTION))
        }
    }

    /**
     * 将一个images id序列映射成illust列表。其中的collection会被展开成其children列表，并去重。
     * @param sorted 返回结果保持有序。默认开启。对book是有必要的，但collection就没有这个需要。控制这个开关来做查询效率优化。
     */
    fun unfoldImages(illustIds: List<Int>, paramNameWhenThrow: String = "images", sorted: Boolean = true): List<Illust> {
        val result = data.db.sequenceOf(Illusts).filter { it.id inList illustIds }.toList()
        //数量不够表示有imageId不存在
        if(result.size < illustIds.size) throw be(ResourceNotExist(paramNameWhenThrow, illustIds.toSet() - result.asSequence().map { it.id }.toSet()))

        if(sorted) {
            //有序时不能做太多优化，就把原id列表依次展开查询
            val resultMap = result.associateBy { it.id }
            return illustIds.asSequence().map { id -> resultMap[id]!! }.flatMap { illust ->
                if(illust.type != IllustModelType.COLLECTION) sequenceOf(illust) else {
                    data.db.sequenceOf(Illusts)
                        .filter { it.parentId eq illust.id }
                        .sortedBy { it.orderTime.asc() }
                        .asKotlinSequence()
                }
            }.distinctBy { it.id }.toList()
        }else{
            //对于collection，做一个易用性处理，将它们的所有子项包括在images列表中; 对于image/image_with_parent，直接加入images列表
            val (collectionResult, imageResult) = result.filterInto { it.type == IllustModelType.COLLECTION }
            //非有序时，一口气查询出所有的children
            val childrenResult = if(collectionResult.isEmpty()) emptyList() else {
                data.db.sequenceOf(Illusts)
                    .filter { it.parentId inList collectionResult.map(Illust::id) }
                    .toList()
            }
            //然后将children和image一起去重
            return (imageResult + childrenResult).distinctBy { it.id }
        }
    }
}