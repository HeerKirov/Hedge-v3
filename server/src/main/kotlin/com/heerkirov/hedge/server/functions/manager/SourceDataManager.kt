package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.appdata.SourceOption
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.form.SourceBookForm
import com.heerkirov.hedge.server.dto.form.SourceTagForm
import com.heerkirov.hedge.server.dto.res.SourceDataAdditionalInfoDto
import com.heerkirov.hedge.server.dto.res.SourceDataIdentity
import com.heerkirov.hedge.server.dto.res.SourceTagDto
import com.heerkirov.hedge.server.enums.SourceEditStatus
import com.heerkirov.hedge.server.events.SourceDataCreated
import com.heerkirov.hedge.server.events.SourceDataDeleted
import com.heerkirov.hedge.server.events.SourceDataUpdated
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.model.SourceData
import com.heerkirov.hedge.server.utils.StrTemplate
import com.heerkirov.hedge.server.utils.business.checkSourceId
import com.heerkirov.hedge.server.utils.ktorm.first
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import com.heerkirov.hedge.server.utils.types.Opt
import com.heerkirov.hedge.server.utils.types.anyOpt
import com.heerkirov.hedge.server.utils.types.optOf
import com.heerkirov.hedge.server.utils.types.undefined
import org.ktorm.dsl.*
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import org.ktorm.support.sqlite.bulkInsertReturning
import java.time.Instant

class SourceDataManager(private val data: DataRepository,
                        private val bus: EventBus,
                        private val sourceSiteManager: SourceSiteManager,
                        private val sourceTagManager: SourceTagManager,
                        private val sourceBookManager: SourceBookManager) {
    /**
     * 检查source key。主要检查source是否是已注册的site，检查part是否存在，检查id/part是否为非负数。
     * @return 如果给出的值是null，那么返回null，否则，返回一个tuple，用于后续工具链处理。
     * @throws ResourceNotExist ("site", string) 给出的source不存在
     */
    fun checkSourceSite(sourceSite: String?, sourceId: String?, sourcePart: Int?, sourcePartName: String?): SourceDataIdentity? {
        return if(sourceSite != null) {
            val site = sourceSiteManager.get(sourceSite) ?: throw be(ResourceNotExist("site", sourceSite))

            if(sourceId.isNullOrEmpty()) throw be(ParamRequired("sourceId"))
            else if(!checkSourceId(sourceId)) throw be(ParamError("sourceId"))

            when (site.partMode) {
                SourceOption.SitePartMode.NO -> {
                    if(sourcePart != null) throw be(ParamNotRequired("sourcePart"))
                    if(sourcePartName != null) throw be(ParamNotRequired("sourcePartName"))
                }
                SourceOption.SitePartMode.PAGE -> {
                    if(sourcePart == null) throw be(ParamRequired("sourcePart"))
                    else if(sourcePart < 0) throw be(ParamError("sourcePart"))
                    if(sourcePartName != null) throw be(ParamNotRequired("sourcePartName"))
                }
                SourceOption.SitePartMode.PAGE_WITH_NAME -> {
                    if(sourcePart == null) throw be(ParamRequired("sourcePart"))
                    else if(sourcePart < 0) throw be(ParamError("sourcePart"))
                }
            }

            SourceDataIdentity(sourceSite, sourceId)
        }else{
            null
        }
    }

    /**
     * 检查source key。主要检查source是否是已注册的site，检查id/part是否为非负数。
     * @return 如果给出的值是null，那么返回null，否则，返回一个pair，用于后续工具链处理。
     * @throws ResourceNotExist ("site", string) 给出的source不存在
     */
    fun checkSourceSite(sourceSite: String?, sourceId: String?): SourceDataIdentity? {
        return if(sourceSite != null) {
            sourceSiteManager.get(sourceSite) ?: throw be(ResourceNotExist("site", sourceSite))

            if(sourceId.isNullOrEmpty()) throw be(ParamRequired("sourceId"))
            else if(!checkSourceId(sourceId)) throw be(ParamError("sourceId"))

            SourceDataIdentity(sourceSite, sourceId)
        }else{
            null
        }
    }

    /**
     * 批量检查source key是否存在。如果存在，检查目标sourceImage是否存在并创建对应的记录。
     * @return rowIds 返回在sourceImage中实际存储的keys。
     * @throws ResourceNotExist ("source", string) 给出的source不存在
     */
    fun bulkValidateAndCreateSourceDataIfNotExist(sources: Collection<SourceDataIdentity>): Map<SourceDataIdentity, Int> {
        val existSourceDataIds = sources.groupBy({ it.sourceSite }) { it.sourceId }
            .flatMap { (site, ids) ->
                data.db.from(SourceDatas)
                    .select(SourceDatas.id, SourceDatas.sourceId)
                    .where { (SourceDatas.sourceSite eq site) and (SourceDatas.sourceId inList ids) }
                    .map { Pair(SourceDataIdentity(site, it[SourceDatas.sourceId]!!), it[SourceDatas.id]!!) }
            }.toMap()

        val notExistSources = sources.filter { p -> p !in existSourceDataIds }
        val newSourceDataIds = if(notExistSources.isNotEmpty()) {
            val now = Instant.now()
            val returningIds = data.db.bulkInsertReturning(SourceDatas, SourceDatas.id) {
                for ((sourceSite, sourceId) in notExistSources) {
                    item {
                        set(it.sourceSite, sourceSite)
                        set(it.sourceId, sourceId)
                        set(it.sortableSourceId, sourceId.toLongOrNull())
                        set(it.title, null)
                        set(it.description, null)
                        set(it.relations, null)
                        set(it.additionalInfo, null)
                        set(it.empty, true)
                        set(it.status, SourceEditStatus.NOT_EDITED)
                        set(it.cachedCount, SourceData.SourceCount(0, 0, 0))
                        set(it.createTime, now)
                        set(it.updateTime, now)
                    }
                }
            }
            if(returningIds.any { it == null }) {
                val nullIndexes = returningIds.mapIndexedNotNull { index, i -> if(i != null) index else null }
                throw RuntimeException("Some sourceData insert failed. Indexes are [${nullIndexes.joinToString(", ")}]")
            }
            @Suppress("UNCHECKED_CAST")
            val ids = returningIds as List<Int>

            notExistSources.zip(ids).toMap()
        }else{
            emptyMap()
        }

        newSourceDataIds.forEach { (sourceSite, sourceId), id -> SourceDataCreated(sourceSite, sourceId, id) }

        return sources.associateWith { p -> existSourceDataIds[p] ?: newSourceDataIds[p]!! }
    }

    /**
     * 检查source key是否存在。如果存在，检查目标sourceImage是否存在并创建对应的记录。在创建之前自动检查source key。
     * @return rowId 返回在sourceImage中实际存储的key。
     * @throws ResourceNotExist ("source", string) 给出的source不存在
     */
    fun validateAndCreateSourceDataIfNotExist(sourceSite: String, sourceId: String): Int {
        val sourceDataId = data.db.from(SourceDatas)
            .select(SourceDatas.id)
            .where { (SourceDatas.sourceSite eq sourceSite) and (SourceDatas.sourceId eq sourceId) }
            .firstOrNull()
            ?.let { it[SourceDatas.id]!! }

        return sourceDataId ?: run {
            val now = Instant.now()
            val id = data.db.insertAndGenerateKey(SourceDatas) {
                set(it.sourceSite, sourceSite)
                set(it.sourceId, sourceId)
                set(it.sortableSourceId, sourceId.toLongOrNull())
                set(it.title, null)
                set(it.description, null)
                set(it.relations, null)
                set(it.additionalInfo, null)
                set(it.empty, true)
                set(it.status, SourceEditStatus.NOT_EDITED)
                set(it.cachedCount, SourceData.SourceCount(0, 0, 0))
                set(it.createTime, now)
                set(it.updateTime, now)
            } as Int

            val verifyId = data.db.from(SourceDatas).select(max(SourceDatas.id).aliased("id")).first().getInt("id")
            if(verifyId != id) {
                throw RuntimeException("SourceData insert failed. generatedKey is $id but queried verify id is $verifyId.")
            }

            bus.emit(SourceDataCreated(sourceSite, sourceId, id))

            id
        }
    }

    /**
     * 根据规则和参数生成来源数据的链接。
     */
    fun generateLinks(rules: List<String>, sourceId: String, sourceTags: List<SourceTagDto>, additionalInfo: List<SourceDataAdditionalInfoDto>): List<String> {
        val arguments = mutableMapOf<String, String>()
        arguments["id"] = sourceId
        arguments.putAll(sourceTags.groupBy { it.type }.filter { it.value.size == 1 }.map { (_, v) -> v.first() }.flatMap { listOf("${it.type}.code" to it.code, "${it.type}.name" to it.name) }.toMap())
        arguments.putAll(additionalInfo.associate { it.field to it.value })
        return rules.mapNotNull { rule ->
            try {
                StrTemplate.render(rule, arguments, "{{", "}}")
            }catch (e: IllegalArgumentException) {
                null
            }
        }
    }

    /**
     * 检查additionalInfo的字段是否合法。
     * @throws ResourceNotExist ("additionalInfo", field) 如果存在不合法的字段，抛出此异常。
     */
    private fun validateAdditionalInfo(sourceSite: String, additionalInfo: Map<String, String>) {
        val site = sourceSiteManager.get(sourceSite)!!
        val availableFields = site.additionalInfo.asSequence().map { it.field }.toSet()
        for (field in additionalInfo.keys) {
            if(field !in availableFields) throw be(ResourceNotExist("additionalInfo", field))
        }
    }

    /**
     * 检查source key是否存在，创建对应记录，并手动更新内容。不会检查sourceSite合法性，因为假设之前已经校验过了。
     * @return (rowId, sourceSite, sourceId) 返回在sourceImage中实际存储的key。
     * @throws ResourceNotExist ("site", string) 给出的site不存在
     * @throws ResourceNotExist ("additionalInfo", field) 存在不合法的字段
     * @throws ResourceNotExist ("sourceTagType", string[]) 列出的tagType不存在
     * @throws ParamError additionalInfo字段不合法
     * @throws NotFound 请求对象不存在 (allowCreate=false时抛出)
     * @throws AlreadyExists 此对象已存在 (allowUpdate=false时抛出)
     */
    fun createOrUpdateSourceData(sourceSite: String, sourceId: String,
                                 status: Opt<SourceEditStatus>,
                                 title: Opt<String?>,
                                 description: Opt<String?>,
                                 tags: Opt<List<SourceTagForm>>,
                                 books: Opt<List<SourceBookForm>>,
                                 relations: Opt<List<String>>,
                                 additionalInfo: Opt<Map<String, String>>,
                                 publishTime: Opt<Instant?>,
                                 allowCreate: Boolean = true,
                                 allowUpdate: Boolean = true,
                                 appendUpdate: Boolean = false): Triple<Int?, String?, String?> {
        val sourceData = data.db.sequenceOf(SourceDatas).firstOrNull { (it.sourceSite eq sourceSite) and (it.sourceId eq sourceId) }
        if(sourceData == null) {
            if(!allowCreate) throw be(NotFound())

            additionalInfo.alsoOpt { validateAdditionalInfo(sourceSite, it) }

            //新建
            val sourceCount = SourceData.SourceCount(
                tags.letOpt { it.size }.unwrapOr { 0 },
                books.letOpt { it.size }.unwrapOr { 0 },
                relations.letOpt { it.size }.unwrapOr { 0 }
            )
            val empty = title.letOpt { it.isNullOrEmpty() }.unwrapOr { true }
                    && description.letOpt { it.isNullOrEmpty() }.unwrapOr { true }
                    && tags.letOpt { it.isEmpty() }.unwrapOr { true }
                    && books.letOpt { it.isEmpty() }.unwrapOr { true }
                    && relations.letOpt { it.isEmpty() }.unwrapOr { true }
            val finalStatus = status.unwrapOr { if(empty) SourceEditStatus.NOT_EDITED else SourceEditStatus.EDITED }

            val now = Instant.now()
            val id = data.db.insertAndGenerateKey(SourceDatas) {
                set(it.sourceSite, sourceSite)
                set(it.sourceId, sourceId)
                set(it.sortableSourceId, sourceId.toLongOrNull())
                set(it.title, title.unwrapOrNull())
                set(it.description, description.unwrapOrNull())
                set(it.relations, relations.unwrapOrNull())
                set(it.additionalInfo, additionalInfo.unwrapOrNull())
                set(it.publishTime, publishTime.unwrapOrNull())
                set(it.cachedCount, sourceCount)
                set(it.empty, empty)
                set(it.status, finalStatus)
                set(it.createTime, now)
                set(it.updateTime, now)
            } as Int

            val verifyId = data.db.from(SourceDatas).select(max(SourceDatas.id).aliased("id")).first().getInt("id")
            if(verifyId != id) {
                throw RuntimeException("SourceData insert failed. generatedKey is $id but queried verify id is $verifyId.")
            }

            tags.applyOpt {
                if(isNotEmpty()) {
                    val tagIds = sourceTagManager.getAndUpsertSourceTags(sourceSite, this)
                    if(tagIds.isNotEmpty()) data.db.batchInsert(SourceTagRelations) {
                        for (tagId in tagIds) {
                            item {
                                set(it.sourceDataId, id)
                                set(it.sourceTagId, tagId)
                            }
                        }
                    }
                }
            }

            books.applyOpt {
                if(isNotEmpty()) {
                    val bookIds = sourceBookManager.getAndUpsertSourceBooks(sourceSite, this)
                    if(bookIds.isNotEmpty()) data.db.batchInsert(SourceBookRelations) {
                        for (bookId in bookIds) {
                            item {
                                set(it.sourceDataId, id)
                                set(it.sourceBookId, bookId)
                            }
                        }
                    }
                }
            }

            bus.emit(SourceDataCreated(sourceSite, sourceId, id))

            return Triple(id, sourceSite, sourceId)
        }else if(!appendUpdate) {
            if(!allowUpdate) throw be(AlreadyExists("SourceData", "sourceId", sourceId))

            additionalInfo.alsoOpt { validateAdditionalInfo(sourceSite, it) }

            val cachedCount = if(anyOpt(tags, books, relations)) {
                Opt(SourceData.SourceCount(
                    tags.letOpt { it.size }.unwrapOr { sourceData.cachedCount.tagCount },
                    books.letOpt { it.size }.unwrapOr { sourceData.cachedCount.bookCount },
                    relations.letOpt { it.size }.unwrapOr { sourceData.cachedCount.relationCount }
                ))
            }else undefined()

            val empty = title.unwrapOr { sourceData.title }.isNullOrEmpty()
                    && description.unwrapOr { sourceData.description }.isNullOrEmpty()
                    && cachedCount.unwrapOr { sourceData.cachedCount }.let { it.relationCount <= 0 && it.bookCount <= 0 && it.tagCount <= 0 }

            val finalStatus = if(status.isPresent) status else if(anyOpt(title, description, tags, books, relations, publishTime)) optOf(SourceEditStatus.EDITED) else undefined()

            if(title.isPresent || description.isPresent || relations.isPresent || cachedCount.isPresent || additionalInfo.isPresent || finalStatus.isPresent || publishTime.isPresent) {
                data.db.update(SourceDatas) {
                    where { it.id eq sourceData.id }
                    title.applyOpt { set(it.title, this) }
                    description.applyOpt { set(it.description, this) }
                    relations.applyOpt { set(it.relations, this) }
                    additionalInfo.applyOpt { set(it.additionalInfo, this) }
                    publishTime.applyOpt { set(it.publishTime, this) }
                    cachedCount.applyOpt { set(it.cachedCount, this) }
                    finalStatus.applyOpt { set(it.status, this) }
                    set(it.empty, empty)
                    set(it.updateTime, Instant.now())
                }
            }

            tags.applyOpt {
                data.db.delete(SourceTagRelations) { it.sourceDataId eq sourceData.id }
                if(isNotEmpty()) {
                    val tagIds = sourceTagManager.getAndUpsertSourceTags(sourceSite, this)
                    data.db.batchInsert(SourceTagRelations) {
                        for (tagId in tagIds) {
                            item {
                                set(it.sourceDataId, sourceData.id)
                                set(it.sourceTagId, tagId)
                            }
                        }
                    }
                }
            }

            books.applyOpt {
                data.db.delete(SourceBookRelations) { it.sourceDataId eq sourceData.id }
                if(isNotEmpty()) {
                    val bookIds = sourceBookManager.getAndUpsertSourceBooks(sourceSite, this)
                    data.db.batchInsert(SourceBookRelations) {
                        for (bookId in bookIds) {
                            item {
                                set(it.sourceDataId, sourceData.id)
                                set(it.sourceBookId, bookId)
                            }
                        }
                    }
                }
            }

            bus.emit(SourceDataUpdated(sourceSite, sourceId, sourceData.id))

            return Triple(sourceData.id, sourceSite, sourceId)
        }else{
            //append模式下，tags、books、relations、additionalInfo将以追加模式编辑，不会完全清空旧值。
            if(!allowUpdate) throw be(AlreadyExists("SourceData", "sourceId", sourceId))

            val fixedAdditionalInfo = additionalInfo.letOpt {
                validateAdditionalInfo(sourceSite, it)
                if(sourceData.additionalInfo.isNullOrEmpty()) it else sourceData.additionalInfo + it
            }

            val fixedRelations = relations.letOpt {
                if(sourceData.relations.isNullOrEmpty()) it else (sourceData.relations + it).distinct()
            }

            var appendTags: Opt<List<Int>> = undefined()
            tags.applyOpt {
                if(isNotEmpty()) {
                    val tagIds = sourceTagManager.getAndUpsertSourceTags(sourceSite, this)
                    val existTagIds = data.db.from(SourceTagRelations)
                        .select(SourceTagRelations.sourceTagId)
                        .where { SourceTagRelations.sourceDataId eq sourceData.id and (SourceTagRelations.sourceTagId inList tagIds) }
                        .map { it[SourceTagRelations.sourceTagId]!! }
                    val appendTagIds = tagIds - existTagIds.toSet()
                    if(appendTagIds.isNotEmpty()) {
                        data.db.batchInsert(SourceTagRelations) {
                            for (tagId in appendTagIds) {
                                item {
                                    set(it.sourceDataId, sourceData.id)
                                    set(it.sourceTagId, tagId)
                                }
                            }
                        }
                        appendTags = optOf(appendTagIds)
                    }
                }
            }

            var appendBooks: Opt<List<Int>> = undefined()
            books.applyOpt {
                if(isNotEmpty()) {
                    val bookIds = sourceBookManager.getAndUpsertSourceBooks(sourceSite, this)
                    val existBookIds = data.db.from(SourceBookRelations)
                        .select(SourceBookRelations.sourceBookId)
                        .where { SourceBookRelations.sourceDataId eq sourceData.id and (SourceBookRelations.sourceBookId inList bookIds) }
                        .map { it[SourceBookRelations.sourceBookId]!! }
                    val appendBookIds = bookIds - existBookIds.toSet()
                    if(appendBookIds.isNotEmpty()) {
                        data.db.batchInsert(SourceBookRelations) {
                            for (bookId in appendBookIds) {
                                item {
                                    set(it.sourceDataId, sourceData.id)
                                    set(it.sourceBookId, bookId)
                                }
                            }
                        }
                        appendBooks = optOf(appendBookIds)
                    }
                }
            }

            val cachedCount = if(anyOpt(appendTags, appendBooks, fixedRelations)) {
                Opt(SourceData.SourceCount(
                    appendTags.letOpt { it.size + sourceData.cachedCount.tagCount }.unwrapOr { sourceData.cachedCount.tagCount },
                    appendBooks.letOpt { it.size + sourceData.cachedCount.bookCount }.unwrapOr { sourceData.cachedCount.bookCount },
                    fixedRelations.letOpt { it.size }.unwrapOr { sourceData.cachedCount.relationCount }
                ))
            }else undefined()

            val empty = title.unwrapOr { sourceData.title }.isNullOrEmpty()
                    && description.unwrapOr { sourceData.description }.isNullOrEmpty()
                    && cachedCount.unwrapOr { sourceData.cachedCount }.let { it.relationCount <= 0 && it.bookCount <= 0 && it.tagCount <= 0 }

            val finalStatus = if(status.isPresent) status else if(anyOpt(title, description, appendTags, appendBooks, fixedRelations, publishTime)) optOf(SourceEditStatus.EDITED) else undefined()

            if(title.isPresent || description.isPresent || fixedRelations.isPresent || cachedCount.isPresent || fixedAdditionalInfo.isPresent || finalStatus.isPresent || publishTime.isPresent) {
                data.db.update(SourceDatas) {
                    where { it.id eq sourceData.id }
                    title.applyOpt { set(it.title, this) }
                    description.applyOpt { set(it.description, this) }
                    fixedRelations.applyOpt { set(it.relations, this) }
                    fixedAdditionalInfo.applyOpt { set(it.additionalInfo, this) }
                    publishTime.applyOpt { set(it.publishTime, this) }
                    cachedCount.applyOpt { set(it.cachedCount, this) }
                    finalStatus.applyOpt { set(it.status, this) }
                    set(it.empty, empty)
                    set(it.updateTime, Instant.now())
                }
            }

            bus.emit(SourceDataUpdated(sourceSite, sourceId, sourceData.id))

            return Triple(sourceData.id, sourceSite, sourceId)
        }
    }

    /**
     * 删除source data。清除在illust的缓存。
     * @throws NotFound 请求对象不存在。
     */
    fun deleteSourceData(sourceSite: String, sourceId: String) {
        val row = data.db.from(SourceDatas).select()
            .where { (SourceDatas.sourceSite eq sourceSite) and (SourceDatas.sourceId eq sourceId) }
            .firstOrNull()
            ?: throw be(NotFound())

        val sourceDataId = row[SourceDatas.id]!!

        data.db.update(Illusts) {
            where { it.sourceDataId eq sourceDataId }
            set(it.sourceDataId, null)
            set(it.sourceSite, null)
            set(it.sourceId, null)
            set(it.sortableSourceId, null)
            set(it.sourcePart, null)
            set(it.sourcePartName, null)
        }

        data.db.delete(SourceDatas) { it.id eq sourceDataId }
        data.db.delete(SourceTagRelations) { it.sourceDataId eq sourceDataId }
        data.db.delete(SourceBookRelations) { it.sourceDataId eq sourceDataId }

        bus.emit(SourceDataDeleted(sourceSite, sourceId))
    }
}