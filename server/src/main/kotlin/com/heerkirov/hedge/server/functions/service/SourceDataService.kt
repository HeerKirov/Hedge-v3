package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.filter.SourceDataQueryFilter
import com.heerkirov.hedge.server.dto.form.SourceDataCreateForm
import com.heerkirov.hedge.server.dto.form.SourceDataUpdateForm
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.manager.SourceDataManager
import com.heerkirov.hedge.server.functions.manager.query.QueryManager
import com.heerkirov.hedge.server.utils.business.takeThumbnailFilepath
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.runIf
import com.heerkirov.hedge.server.utils.types.*
import org.ktorm.dsl.*

class SourceDataService(private val data: DataRepository, private val sourceManager: SourceDataManager, private val queryManager: QueryManager) {
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
        val titles = data.setting.source.sites.associate { it.name to it.title }
        return data.db.from(SourceDatas)
            .let { schema?.joinConditions?.fold(it) { acc, join -> if(join.left) acc.leftJoin(join.table, join.condition) else acc.innerJoin(join.table, join.condition) } ?: it }
            .let { if(filter.sourceTag == null) it else {
                it.innerJoin(SourceTagRelations, SourceTagRelations.sourceDataId eq SourceDatas.id)
                    .innerJoin(SourceTags, (SourceTags.id eq SourceTagRelations.sourceTagId) and (SourceTags.name eq filter.sourceTag))
            } }
            .let { if(filter.imageId == null) it else it.innerJoin(Illusts, (Illusts.sourceDataId eq SourceDatas.id) and (Illusts.id eq filter.imageId)) }
            .select(SourceDatas.sourceSite, SourceDatas.sourceId, SourceDatas.cachedCount, SourceDatas.createTime, SourceDatas.updateTime, SourceDatas.empty, SourceDatas.status)
            .whereWithConditions {
                if(filter.site != null) {
                    it += SourceDatas.sourceSite eq filter.site
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
     * @throws ResourceNotExist ("site", string) ?????????site?????????
     * @throws AlreadyExists ??????????????????
     */
    fun create(form: SourceDataCreateForm) {
        data.db.transaction {
            sourceManager.checkSourceSite(form.sourceSite, form.sourceId)
            sourceManager.createOrUpdateSourceData(form.sourceSite, form.sourceId,
                title = form.title, description = form.description, tags = form.tags,
                books = form.books, relations = form.relations,
                status = form.status, allowUpdate = false)
        }
    }

    /**
     * ???source image????????????????????????????????????
     * @throws ResourceNotExist ("site", string) ?????????site?????????
     */
    fun bulk(forms: List<SourceDataCreateForm>) {
        data.db.transaction {
            forms.forEach { form -> sourceManager.checkSourceSite(form.sourceSite, form.sourceId) }
            forms.forEach { form ->
                sourceManager.createOrUpdateSourceData(form.sourceSite, form.sourceId,
                    title = form.title, description = form.description, tags = form.tags,
                    books = form.books, relations = form.relations)
            }
        }
    }

    /**
     * @throws NotFound ?????????????????????
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
            .map { SourceTagDto(it.code, it.name, it.otherName, it.type) }
        val sourceBooks = data.db.from(SourceBooks)
            .innerJoin(SourceBookRelations, (SourceBooks.id eq SourceBookRelations.sourceBookId) and (SourceBookRelations.sourceDataId eq sourceRowId))
            .select()
            .map { SourceBooks.createEntity(it) }
            .map { SourceBookDto(it.code, it.title) }
        val sourceTitle = data.setting.source.sites.find { it.name == sourceSite }?.title

        return SourceDataDetailRes(sourceSite, sourceTitle ?: sourceSite, sourceId,
            row[SourceDatas.title] ?: "",
            row[SourceDatas.description] ?: "",
            row[SourceDatas.empty]!!,
            row[SourceDatas.status]!!,
            sourceTags, sourceBooks, row[SourceDatas.relations] ?: emptyList(),
            createTime, updateTime)
    }

    fun getRelatedImages(sourceSite: String, sourceId: Long): List<IllustSimpleRes> {
        return data.db.from(Illusts)
            .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
            .select(Illusts.id, FileRecords.id, FileRecords.folder, FileRecords.extension, FileRecords.status)
            .where { (Illusts.sourceId eq sourceId) and (Illusts.sourceSite eq sourceSite) }
            .orderBy(Illusts.id.asc())
            .map { row ->
                val id = row[Illusts.id]!!
                val thumbnailFile = takeThumbnailFilepath(row)
                IllustSimpleRes(id, thumbnailFile)
            }
    }

    /**
     * @throws NotFound ?????????????????????
     * @throws ResourceNotExist ("site", string) ?????????site?????????
     */
    fun update(sourceSite: String, sourceId: Long, form: SourceDataUpdateForm) {
        data.db.transaction {
            sourceManager.checkSourceSite(sourceSite, sourceId)
            sourceManager.createOrUpdateSourceData(sourceSite, sourceId,
                title = form.title, description = form.description, tags = form.tags,
                books = form.books, relations = form.relations,
                status = form.status, allowCreate = false)
        }
    }

    /**
     * @throws NotFound ?????????????????????
     */
    fun delete(sourceSite: String, sourceId: Long) {
        data.db.transaction {
            sourceManager.deleteSourceData(sourceSite, sourceId)
        }
    }
}