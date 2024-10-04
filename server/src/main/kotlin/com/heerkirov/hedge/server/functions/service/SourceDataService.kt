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
import com.heerkirov.hedge.server.functions.manager.SourceAnalyzeManager
import com.heerkirov.hedge.server.functions.manager.SourceDataManager
import com.heerkirov.hedge.server.functions.manager.SourceSiteManager
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

class SourceDataService(private val data: DataRepository,
                        private val sourceSiteManager: SourceSiteManager,
                        private val sourceDataManager: SourceDataManager,
                        private val sourceAnalyzeManager: SourceAnalyzeManager,
                        private val queryManager: QueryManager) {
    private val orderTranslator = OrderTranslator {
        "rowId" to SourceDatas.id
        "sourceId" to SourceDatas.sourceId
        "site" to SourceDatas.sourceSite
        "createTime" to SourceDatas.createTime
        "updateTime" to SourceDatas.updateTime
        "publishTime" to SourceDatas.publishTime
    }

    fun list(filter: SourceDataQueryFilter): ListResult<SourceDataRes> {
        val schema = if(filter.query.isNullOrBlank()) null else {
            queryManager.querySchema(filter.query, QueryManager.Dialect.SOURCE_DATA).executePlan ?: return ListResult(0, emptyList())
        }
        val titles = sourceSiteManager.list().associate { it.name to it.title }
        return data.db.from(SourceDatas)
            .let { schema?.joinConditions?.fold(it) { acc, join -> if(join.left) acc.leftJoin(join.table, join.condition) else acc.innerJoin(join.table, join.condition) } ?: it }
            .let { if(filter.sourceTag == null) it else {
                it.innerJoin(SourceTagRelations, SourceTagRelations.sourceDataId eq SourceDatas.id)
                    .innerJoin(SourceTags, (SourceTags.id eq SourceTagRelations.sourceTagId) and (SourceTags.name eq filter.sourceTag))
            } }
            .let { if(filter.imageId == null) it else it.innerJoin(Illusts, (Illusts.sourceDataId eq SourceDatas.id) and (Illusts.id eq filter.imageId)) }
            .select(SourceDatas.sourceSite, SourceDatas.sourceId, SourceDatas.cachedCount, SourceDatas.createTime, SourceDatas.updateTime, SourceDatas.empty, SourceDatas.publishTime, SourceDatas.status)
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
                val publishTime = it[SourceDatas.publishTime]
                SourceDataRes(source, titles.getOrDefault(source, source), sourceId, cachedCount.tagCount, cachedCount.bookCount, cachedCount.relationCount, empty, status, publishTime, createTime, updateTime)
            }
    }

    /**
     * @throws ResourceNotExist ("site", string) 给出的site不存在
     * @throws ResourceNotExist ("additionalInfo", field) 存在不合法的字段
     * @throws ResourceNotExist ("sourceTagType", string[]) 列出的tagType不存在
     * @throws AlreadyExists 此对象已存在
     */
    fun create(form: SourceDataCreateForm) {
        data.db.transaction {
            sourceDataManager.checkSourceSite(form.sourceSite, form.sourceId)
            sourceDataManager.createOrUpdateSourceData(form.sourceSite, form.sourceId,
                title = form.title, description = form.description, tags = form.tags,
                books = form.books, relations = form.relations, links = form.links,
                additionalInfo = form.additionalInfo.letOpt { it.associateBy({ f -> f.field }) { f -> f.value } },
                publishTime = form.publishTime,
                status = form.status, allowUpdate = false)
        }
    }

    /**
     * 对source image进行声明式的批量操作。
     * @throws ResourceNotExist ("site", string) 给出的site不存在
     * @throws ResourceNotExist ("additionalInfo", field) 存在不合法的字段
     * @throws ResourceNotExist ("sourceTagType", string[]) 列出的tagType不存在
     */
    fun bulk(bulks: List<SourceDataCreateForm>): BulkResult<SourceDataIdentity> {
        return bulks.collectBulkResult({ SourceDataIdentity(it.sourceSite, it.sourceId) }) { form ->
            data.db.transaction {
                sourceDataManager.checkSourceSite(form.sourceSite, form.sourceId)
                sourceDataManager.createOrUpdateSourceData(form.sourceSite, form.sourceId,
                    title = form.title, description = form.description, status = form.status,
                    tags = form.tags, books = form.books, relations = form.relations, links = form.links,
                    additionalInfo = form.additionalInfo.letOpt { it.associateBy({ f -> f.field }) { f -> f.value } },
                    publishTime = form.publishTime)
            }
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun get(sourceSite: String, sourceId: String): SourceDataDetailRes {
        val row = data.db.from(SourceDatas).select()
            .where { (SourceDatas.sourceSite eq sourceSite) and (SourceDatas.sourceId eq sourceId) }
            .firstOrNull()
            ?: throw be(NotFound())

        val sourceRowId = row[SourceDatas.id]!!
        val createTime = row[SourceDatas.createTime]!!
        val updateTime = row[SourceDatas.updateTime]!!
        val publishTime = row[SourceDatas.publishTime]
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
        val site = sourceSiteManager.get(sourceSite)
        val additionalInfo = (row[SourceDatas.additionalInfo] ?: emptyMap()).entries.map { (k, v) ->
            SourceDataAdditionalInfoDto(k, site?.additionalInfo?.find { it.field == k }?.label ?: "", v)
        }

        return SourceDataDetailRes(sourceSite, site?.title ?: sourceSite, sourceId,
            row[SourceDatas.title] ?: "",
            row[SourceDatas.description] ?: "",
            row[SourceDatas.empty]!!,
            row[SourceDatas.status]!!,
            sourceTags, sourceBooks,
            row[SourceDatas.relations] ?: emptyList(),
            row[SourceDatas.links] ?: emptyList(),
            additionalInfo, publishTime,
            createTime, updateTime)
    }

    fun getRelatedImages(sourceSite: String, sourceId: String): List<IllustSimpleRes> {
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
     * @throws ResourceNotExist ("additionalInfo", field) 存在不合法的字段
     * @throws ResourceNotExist ("sourceTagType", string[]) 列出的tagType不存在
     */
    fun update(sourceSite: String, sourceId: String, form: SourceDataUpdateForm) {
        data.db.transaction {
            sourceDataManager.checkSourceSite(sourceSite, sourceId)
            sourceDataManager.createOrUpdateSourceData(sourceSite, sourceId,
                title = form.title, description = form.description, tags = form.tags,
                books = form.books, relations = form.relations, links = form.links,
                additionalInfo = form.additionalInfo.letOpt { it.associateBy({ f -> f.field }) { f -> f.value } },
                publishTime = form.publishTime,
                status = form.status, allowCreate = false)
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun delete(sourceSite: String, sourceId: String) {
        data.db.transaction {
            sourceDataManager.deleteSourceData(sourceSite, sourceId)
        }
    }

    /**
     * 该API查询一系列的来源对象的收集情况。收集情况包括：来源数据收集状态、已收集图像数量、不在同一个ID下的已收集图像数量。
     * 每一个path都指定了site, id, part, partName这4个参数，其中part, partName参数可选。
     * - 来源数据收集状态会根据(site, id)查询获得。
     * - 已收集图像数量则是统计image/importImage项的数量，存在partName时优先(site, id, partName)，否则(site, id, part)，都没有就(site, id)
     * - 而不在同一个ID下的图像数量则统计(site, partName)相同但id不同的项的数量。
     * 在使用中可以轻易发现当前ID下是否已收集当前分页，或当前分页是否已在其他ID下被收集。
     */
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

        return paths.map { path ->
            val key = path.sourceSite to path.sourceId
            val sourceData = sourceDatas[key]

            //查询每个sourceDataPath对应的image与importImage的数量
            //如果要优化的话，这里的场景分支有点多，而且对性能的提升并不明显，因此放弃了优化，逐项统计数量
            val count = if (sourceData?.first == null) 0 else {
                data.db.from(Illusts)
                    .select(count(Illusts.id).aliased("count"))
                    .whereWithConditions {
                        it += Illusts.sourceDataId eq sourceData.first
                        if(path.sourcePartName != null) {
                            it += Illusts.sourcePartName eq path.sourcePartName
                        }else if(path.sourcePart != null) {
                            it += Illusts.sourcePart eq path.sourcePart
                        }
                    }
                    .first()
                    .getInt("count")
            }
            val diffIdCount = if(path.sourcePartName == null) 0 else data.db.from(Illusts)
                .select(count(Illusts.id).aliased("count"))
                .whereWithConditions {
                    it += Illusts.sourceSite eq path.sourceSite
                    it += Illusts.sourceId notEq path.sourceId
                    it += Illusts.sourcePartName eq path.sourcePartName
                }
                .first()
                .getInt("count")

            val collected = sourceData != null && (sourceData.second == SourceEditStatus.EDITED || sourceData.second == SourceEditStatus.IGNORED)
            val collectStatus = sourceData?.second
            val collectTime = sourceData?.third
            SourceDataCollectStatus(path, count, diffIdCount, collected, collectStatus, collectTime)
        }
    }

    /**
     * 该API调用import文件名解析，将传入的filename解析为对应的source identity以及匹配的image。
     */
    fun analyseSourceName(filenames: List<String>): List<SourceDataAnalyseResult> {
        val ret = mutableListOf<SourceDataAnalyseResult>()
        for (filename in filenames) {
            val r = try {
                sourceAnalyzeManager.analyseSourceMeta(filename)
            }catch (e: BusinessException) {
                ret.add(SourceDataAnalyseResult(filename, null, null, e.message!!))
                continue
            }
            val sourceDataPath = if(r != null) r.first else {
                ret.add(SourceDataAnalyseResult(filename, null, null, null))
                continue
            }

            val imageId = data.db.from(Illusts)
                .select(Illusts.id)
                .whereWithConditions {
                    it += Illusts.sourceId eq sourceDataPath.sourceId
                    it += Illusts.sourceSite eq sourceDataPath.sourceSite
                    if(sourceDataPath.sourcePart != null) it += Illusts.sourcePart eq sourceDataPath.sourcePart
                    if(sourceDataPath.sourcePartName != null) it += Illusts.sourcePartName eq sourceDataPath.sourcePartName
                }
                .map { it[Illusts.id]!! }
                .firstOrNull()

            ret.add(SourceDataAnalyseResult(filename, sourceDataPath, imageId, null))
        }
        return ret
    }
}