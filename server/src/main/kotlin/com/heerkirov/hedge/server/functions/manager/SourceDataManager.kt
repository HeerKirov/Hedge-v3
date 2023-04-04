package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.Illusts
import com.heerkirov.hedge.server.dao.SourceDatas
import com.heerkirov.hedge.server.dao.SourceBookRelations
import com.heerkirov.hedge.server.dao.SourceTagRelations
import com.heerkirov.hedge.server.dto.form.SourceBookForm
import com.heerkirov.hedge.server.dto.form.SourceTagForm
import com.heerkirov.hedge.server.enums.SourceEditStatus
import com.heerkirov.hedge.server.events.SourceDataCreated
import com.heerkirov.hedge.server.events.SourceDataDeleted
import com.heerkirov.hedge.server.events.SourceDataUpdated
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.model.SourceData
import com.heerkirov.hedge.server.utils.DateTime
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import com.heerkirov.hedge.server.utils.types.Opt
import com.heerkirov.hedge.server.utils.types.anyOpt
import com.heerkirov.hedge.server.utils.types.optOf
import com.heerkirov.hedge.server.utils.types.undefined
import org.ktorm.dsl.*
import org.ktorm.entity.*

class SourceDataManager(private val data: DataRepository,
                        private val bus: EventBus,
                        private val sourceTagManager: SourceTagManager,
                        private val sourceBookManager: SourceBookManager) {
    /**
     * 检查source key。主要检查source是否是已注册的site，检查part是否存在，检查id/part是否为非负数。
     * @return 如果给出的值是null，那么返回null，否则，返回一个tuple，用于后续工具链处理。
     * @throws ResourceNotExist ("site", string) 给出的source不存在
     */
    fun checkSourceSite(sourceSite: String?, sourceId: Long?, sourcePart: Int?): Triple<String, Long, Int?>? {
        return if(sourceSite != null) {
            val site = data.setting.source.sites.firstOrNull { it.name == sourceSite } ?: throw be(ResourceNotExist("site", sourceSite))

            if(sourceId == null) throw be(ParamRequired("sourceId"))
            else if(sourceId < 0) throw be(ParamError("sourceId"))

            if(site.hasSecondaryId && sourcePart == null) throw be(ParamRequired("sourcePart"))
            else if(!site.hasSecondaryId && sourcePart != null) throw be(ParamNotRequired("sourcePart"))

            if(sourcePart != null && sourcePart < 0) throw be(ParamError("sourcePart"))

            Triple(sourceSite, sourceId, sourcePart)
        }else{
            null
        }
    }

    /**
     * 检查source key。主要检查source是否是已注册的site，检查id/part是否为非负数。
     * @return 如果给出的值是null，那么返回null，否则，返回一个pair，用于后续工具链处理。
     * @throws ResourceNotExist ("site", string) 给出的source不存在
     */
    fun checkSourceSite(sourceSite: String?, sourceId: Long?): Pair<String, Long>? {
        return if(sourceSite != null) {
            data.setting.source.sites.firstOrNull { it.name == sourceSite } ?: throw be(ResourceNotExist("site", sourceSite))

            if(sourceId == null) throw be(ParamRequired("sourceId"))
            else if(sourceId < 0) throw be(ParamError("sourceId"))

            Pair(sourceSite, sourceId)
        }else{
            null
        }
    }

    /**
     * 检查source key是否存在。如果存在，检查目标sourceImage是否存在并创建对应的记录。在创建之前自动检查source key。
     * @return (rowId, source, sourceId) 返回在sourceImage中实际存储的key。
     * @throws ResourceNotExist ("source", string) 给出的source不存在
     */
    fun validateAndCreateSourceDataIfNotExist(sourceSite: String, sourceId: Long): Triple<Int?, String?, Long?> {
        val sourceData = data.db.sequenceOf(SourceDatas).firstOrNull { (it.sourceSite eq sourceSite) and (it.sourceId eq sourceId) }
        return if(sourceData != null) {
            Triple(sourceData.id, sourceSite, sourceId)
        }else{
            val now = DateTime.now()
            val id = data.db.insertAndGenerateKey(SourceDatas) {
                set(it.sourceSite, sourceSite)
                set(it.sourceId, sourceId)
                set(it.title, null)
                set(it.description, null)
                set(it.relations, null)
                set(it.empty, true)
                set(it.status, SourceEditStatus.NOT_EDITED)
                set(it.cachedCount, SourceData.SourceCount(0, 0, 0))
                set(it.createTime, now)
                set(it.updateTime, now)
            } as Int

            bus.emit(SourceDataCreated(sourceSite, sourceId))

            Triple(id, sourceSite, sourceId)
        }
    }

    /**
     * 检查source key是否存在，创建对应记录，并手动更新内容。不会检查source合法性，因为假设之前已经校验过了。
     * @return (rowId, sourceSite, sourceId) 返回在sourceImage中实际存储的key。
     * @throws ResourceNotExist ("source", string) 给出的source不存在
     * @throws NotFound 请求对象不存在 (allowCreate=false时抛出)
     * @throws AlreadyExists 此对象已存在 (allowUpdate=false时抛出)
     */
    fun createOrUpdateSourceData(sourceSite: String, sourceId: Long,
                                 status: Opt<SourceEditStatus> = undefined(),
                                 title: Opt<String?> = undefined(),
                                 description: Opt<String?> = undefined(),
                                 tags: Opt<List<SourceTagForm>> = undefined(),
                                 books: Opt<List<SourceBookForm>> = undefined(),
                                 relations: Opt<List<Long>> = undefined(),
                                 allowCreate: Boolean = true,
                                 allowUpdate: Boolean = true): Triple<Int?, String?, Long?> {
        val sourceData = data.db.sequenceOf(SourceDatas).firstOrNull { (it.sourceSite eq sourceSite) and (it.sourceId eq sourceId) }
        if(sourceData == null) {
            if(!allowCreate) throw be(NotFound())
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

            val now = DateTime.now()
            val id = data.db.insertAndGenerateKey(SourceDatas) {
                set(it.sourceSite, sourceSite)
                set(it.sourceId, sourceId)
                set(it.title, title.unwrapOrNull())
                set(it.description, description.unwrapOrNull())
                set(it.relations, relations.unwrapOrNull())
                set(it.cachedCount, sourceCount)
                set(it.empty, empty)
                set(it.status, finalStatus)
                set(it.createTime, now)
                set(it.updateTime, now)
            } as Int

            tags.applyOpt {
                if(isNotEmpty()) {
                    val tagIds = sourceTagManager.getAndUpsertSourceTags(sourceSite, this)
                    data.db.batchInsert(SourceTagRelations) {
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
                    data.db.batchInsert(SourceBookRelations) {
                        for (bookId in bookIds) {
                            item {
                                set(it.sourceDataId, id)
                                set(it.sourceBookId, bookId)
                            }
                        }
                    }
                }
            }

            bus.emit(SourceDataCreated(sourceSite, sourceId))

            return Triple(id, sourceSite, sourceId)
        }else{
            if(!allowUpdate) throw be(AlreadyExists("SourceData", "sourceId", sourceId))
            //更新
            val sourceCount = if(anyOpt(tags, books, relations)) {
                Opt(SourceData.SourceCount(
                    tags.letOpt { it.size }.unwrapOr { sourceData.cachedCount.tagCount },
                    books.letOpt { it.size }.unwrapOr { sourceData.cachedCount.bookCount },
                    relations.letOpt { it.size }.unwrapOr { sourceData.cachedCount.relationCount }
                ))
            }else undefined()

            val empty = title.unwrapOr { sourceData.title }.isNullOrEmpty()
                    && description.unwrapOr { sourceData.description }.isNullOrEmpty()
                    && if(relations.isPresent) { relations.value } else { sourceData.relations }.isNullOrEmpty()
                    && if(books.isPresent) { books.value.isEmpty() } else { data.db.sequenceOf(SourceBookRelations).count { it.sourceDataId eq sourceData.id } == 0 }
                    && if(tags.isPresent) { tags.value.isEmpty() } else { data.db.sequenceOf(SourceTagRelations).count { it.sourceDataId eq sourceData.id } == 0 }
            val finalStatus = if(status.isPresent) status else if(anyOpt(title, description, tags, books, relations)) optOf(SourceEditStatus.EDITED) else undefined()

            if(title.isPresent || description.isPresent || relations.isPresent || books.isPresent || sourceCount.isPresent || finalStatus.isPresent) {
                data.db.update(SourceDatas) {
                    where { it.id eq sourceData.id }
                    title.applyOpt { set(it.title, this) }
                    description.applyOpt { set(it.description, this) }
                    relations.applyOpt { set(it.relations, this) }
                    sourceCount.applyOpt { set(it.cachedCount, this) }
                    finalStatus.applyOpt { set(it.status, this) }
                    set(it.empty, empty)
                    set(it.updateTime, DateTime.now())
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

            bus.emit(SourceDataUpdated(sourceSite, sourceId))

            return Triple(sourceData.id, sourceSite, sourceId)
        }
    }

    /**
     * 删除source data。清除在illust的缓存。
     * @throws NotFound 请求对象不存在。
     */
    fun deleteSourceData(sourceSite: String, sourceId: Long) {
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
            set(it.sourcePart, null)
        }

        data.db.delete(SourceDatas) { it.id eq sourceDataId }
        data.db.delete(SourceTagRelations) { it.sourceDataId eq sourceDataId }
        data.db.delete(SourceBookRelations) { it.sourceDataId eq sourceDataId }

        bus.emit(SourceDataDeleted(sourceSite, sourceId))
    }
}