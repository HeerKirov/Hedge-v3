package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.filter.SourceDataQueryFilter
import com.heerkirov.hedge.server.dto.form.SourceDataCreateForm
import com.heerkirov.hedge.server.dto.form.SourceDataUpdateForm
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.SourceEditStatus
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.manager.SourceDataManager
import com.heerkirov.hedge.server.functions.manager.query.QueryManager
import com.heerkirov.hedge.server.utils.business.collectBulkResult
import com.heerkirov.hedge.server.utils.business.filePathFrom
import com.heerkirov.hedge.server.utils.business.toListResult
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.first
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.runIf
import com.heerkirov.hedge.server.utils.types.*
import org.ktorm.dsl.*

class SourceDataService(private val appdata: AppDataManager, private val data: DataRepository, private val sourceManager: SourceDataManager, private val queryManager: QueryManager) {
    private val orderTranslator = OrderTranslator {
        "rowId" to SourceDatas.id
        "sourceId" to SourceDatas.sourceId
        "site" to SourceDatas.sourceSite
        "createTime" to SourceDatas.createTime
        "updateTime" to SourceDatas.updateTime
    }

    fun list(filter: SourceDataQueryFilter): ListResult<SourceDataRes> {
        val schema = if(filter.query.isNullOrBlank()) null else {
            queryManager.querySchema(filter.query, QueryManager.Dialect.SOURCE_DATA).executePlan ?: return ListResult(0, emptyList())
        }
        val titles = appdata.setting.source.sites.associate { it.name to it.title }
        return data.db.from(SourceDatas)
            .let { schema?.joinConditions?.fold(it) { acc, join -> if(join.left) acc.leftJoin(join.table, join.condition) else acc.innerJoin(join.table, join.condition) } ?: it }
            .let { if(filter.sourceTag == null) it else {
                it.innerJoin(SourceTagRelations, SourceTagRelations.sourceDataId eq SourceDatas.id)
                    .innerJoin(SourceTags, (SourceTags.id eq SourceTagRelations.sourceTagId) and (SourceTags.name eq filter.sourceTag))
            } }
            .let { if(filter.imageId == null) it else it.innerJoin(Illusts, (Illusts.sourceDataId eq SourceDatas.id) and (Illusts.id eq filter.imageId)) }
            .select(SourceDatas.sourceSite, SourceDatas.sourceId, SourceDatas.cachedCount, SourceDatas.createTime, SourceDatas.updateTime, SourceDatas.empty, SourceDatas.status)
            .whereWithConditions {
                if(!filter.site.isNullOrEmpty()) {
                    it += if(filter.site.size > 1) SourceDatas.sourceSite inList filter.site else SourceDatas.sourceSite eq filter.site.first()
                }
                if(filter.status != null) {
                    it += SourceDatas.status inList filter.status
                }
                if(schema != null && schema.whereConditions.isNotEmpty()) {
                    it.addAll(schema.whereConditions)
                }
            }
            .runIf(schema?.distinct == true) { groupBy(SourceDatas.id) }
            .limit(filter.offset, filter.limit)
            .orderBy(orderTranslator, filter.order, schema?.orderConditions, default = descendingOrderItem("rowId"))
            .toListResult {
                val source = it[SourceDatas.sourceSite]!!
                val sourceId = it[SourceDatas.sourceId]!!
                val cachedCount = it[SourceDatas.cachedCount]!!
                val empty = it[SourceDatas.empty]!!
                val status = it[SourceDatas.status]!!
                val createTime = it[SourceDatas.createTime]!!
                val updateTime = it[SourceDatas.updateTime]!!
                SourceDataRes(source, titles.getOrDefault(source, source), sourceId, cachedCount.tagCount, cachedCount.bookCount, cachedCount.relationCount, empty, status, createTime, updateTime)
            }
    }

    /**
     * @throws ResourceNotExist ("site", string) 给出的site不存在
     * @throws AlreadyExists 此对象已存在
     */
    fun create(form: SourceDataCreateForm) {
        data.db.transaction {
            sourceManager.checkSourceSite(form.sourceSite, form.sourceId)
            sourceManager.createOrUpdateSourceData(form.sourceSite, form.sourceId,
                title = form.title, description = form.description, tags = form.tags,
                books = form.books, relations = form.relations, links = form.links,
                additionalInfo = form.additionalInfo.letOpt { it.associateBy({ f -> f.field }) { f -> f.value } },
                status = form.status, allowUpdate = false)
        }
    }

    /**
     * 对source image进行声明式的批量操作。
     * @throws ResourceNotExist ("site", string) 给出的site不存在
     */
    fun bulk(bulks: List<SourceDataCreateForm>): BulkResult<SourceDataIdentity> {
        return bulks.collectBulkResult({ SourceDataIdentity(it.sourceSite, it.sourceId) }) { form ->
            data.db.transaction {
                sourceManager.checkSourceSite(form.sourceSite, form.sourceId)
                sourceManager.createOrUpdateSourceData(form.sourceSite, form.sourceId,
                    title = form.title, description = form.description, status = form.status,
                    tags = form.tags, books = form.books, relations = form.relations, links = form.links,
                    additionalInfo = form.additionalInfo.letOpt { it.associateBy({ f -> f.field }) { f -> f.value } })
            }
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun get(sourceSite: String, sourceId: Long): SourceDataDetailRes {
        val row = data.db.from(SourceDatas).select()
            .where { (SourceDatas.sourceSite eq sourceSite) and (SourceDatas.sourceId eq sourceId) }
            .firstOrNull()
            ?: throw be(NotFound())

        val sourceRowId = row[SourceDatas.id]!!
        val createTime = row[SourceDatas.createTime]!!
        val updateTime = row[SourceDatas.updateTime]!!
        val sourceTags = data.db.from(SourceTags)
            .innerJoin(SourceTagRelations, (SourceTags.id eq SourceTagRelations.sourceTagId) and (SourceTagRelations.sourceDataId eq sourceRowId))
            .select()
            .map { SourceTags.createEntity(it) }
            .map { SourceTagDto(it.code, it.type, it.name, it.otherName) }
        val sourceBooks = data.db.from(SourceBooks)
            .innerJoin(SourceBookRelations, (SourceBooks.id eq SourceBookRelations.sourceBookId) and (SourceBookRelations.sourceDataId eq sourceRowId))
            .select()
            .map { SourceBooks.createEntity(it) }
            .map { SourceBookDto(it.code, it.title, it.otherTitle) }
        val site = appdata.setting.source.sites.find { it.name == sourceSite }
        val additionalInfo = (row[SourceDatas.additionalInfo] ?: emptyMap()).entries.map { (k, v) ->
            SourceDataAdditionalInfoDto(k, site?.availableAdditionalInfo?.find { it.field == k }?.label ?: "", v)
        }

        return SourceDataDetailRes(sourceSite, site?.title ?: sourceSite, sourceId,
            row[SourceDatas.title] ?: "",
            row[SourceDatas.description] ?: "",
            row[SourceDatas.empty]!!,
            row[SourceDatas.status]!!,
            sourceTags, sourceBooks,
            row[SourceDatas.relations] ?: emptyList(),
            row[SourceDatas.links] ?: emptyList(),
            additionalInfo,
            createTime, updateTime)
    }

    fun getRelatedImages(sourceSite: String, sourceId: Long): List<IllustSimpleRes> {
        return data.db.from(Illusts)
            .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
            .select(Illusts.id, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { (Illusts.sourceId eq sourceId) and (Illusts.sourceSite eq sourceSite) }
            .orderBy(Illusts.id.asc())
            .map { row ->
                val id = row[Illusts.id]!!
                val filePath = filePathFrom(row)
                IllustSimpleRes(id, filePath)
            }
    }

    /**
     * @throws NotFound 请求对象不存在
     * @throws ResourceNotExist ("site", string) 给出的site不存在
     */
    fun update(sourceSite: String, sourceId: Long, form: SourceDataUpdateForm) {
        data.db.transaction {
            sourceManager.checkSourceSite(sourceSite, sourceId)
            sourceManager.createOrUpdateSourceData(sourceSite, sourceId,
                title = form.title, description = form.description, tags = form.tags,
                books = form.books, relations = form.relations, links = form.links,
                additionalInfo = form.additionalInfo.letOpt { it.associateBy({ f -> f.field }) { f -> f.value } },
                status = form.status, allowCreate = false)
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun delete(sourceSite: String, sourceId: Long) {
        data.db.transaction {
            sourceManager.deleteSourceData(sourceSite, sourceId)
        }
    }

    fun getCollectStatus(paths: List<SourceDataPath>): List<SourceDataCollectStatus> {
        //分离sourceIdentity，并查询每个sourceIdentity对应的sourceData的状态
        val sourceDatas = paths
            .groupBy({ it.sourceSite }) { it.sourceId }
            .asSequence()
            .flatMap { (site, ids) ->
                data.db.from(SourceDatas)
                    .select(SourceDatas.id, SourceDatas.sourceId, SourceDatas.status, SourceDatas.updateTime)
                    .where { (SourceDatas.sourceSite eq site) and (SourceDatas.sourceId inList ids.distinct()) }
                    .map { (site to it[SourceDatas.sourceId]!!) to Triple(it[SourceDatas.id]!!, it[SourceDatas.status]!!, it[SourceDatas.updateTime]!!) }
            }.toMap()

        //查询每个sourceDataPath对应的image与importImage的数量
        //如果要优化的话，这里的场景分支有点多，而且对性能的提升并不明显，因此放弃了优化，逐项统计数量
        val imageCounts = paths.associate { path ->
            val key = path.sourceSite to path.sourceId
            val sourceDataRowId = sourceDatas[key]?.first
            val imageCount = if (sourceDataRowId == null) 0 else {
                data.db.from(Illusts)
                    .select(count(Illusts.id).aliased("count"))
                    .whereWithConditions {
                        it += Illusts.sourceDataId eq sourceDataRowId
                        if (path.sourcePartName != null) it += Illusts.sourcePartName eq path.sourcePartName
                        else if (path.sourcePart != null) it += Illusts.sourcePart eq path.sourcePart
                    }
                    .first()
                    .getInt("count")
            }
            val importImageCount = data.db.from(ImportImages)
                .select(count(ImportImages.id).aliased("count"))
                .whereWithConditions {
                    it += ImportImages.sourceSite eq path.sourceSite
                    it += ImportImages.sourceId eq path.sourceId
                    if (path.sourcePartName != null) it += ImportImages.sourcePartName eq path.sourcePartName
                    else if (path.sourcePart != null) it += ImportImages.sourcePart eq path.sourcePart
                }
                .first()
                .getInt("count")
            key to (imageCount + importImageCount)
        }

        return paths.map { path ->
            val key = path.sourceSite to path.sourceId
            val sourceData = sourceDatas[key]
            val imageCount = imageCounts[key] ?: 0
            val collected = sourceData != null && (sourceData.second == SourceEditStatus.EDITED || sourceData.second == SourceEditStatus.IGNORED)
            val collectStatus = sourceData?.second
            val collectTime = sourceData?.third
            SourceDataCollectStatus(path, imageCount, collected, collectStatus, collectTime)
        }
    }
}