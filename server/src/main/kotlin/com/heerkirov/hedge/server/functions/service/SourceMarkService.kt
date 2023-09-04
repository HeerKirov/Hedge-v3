package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.SourceDatas
import com.heerkirov.hedge.server.dao.SourceMarks
import com.heerkirov.hedge.server.dto.form.SourceMarkPartialUpdateForm
import com.heerkirov.hedge.server.dto.res.SourceMarkRes
import com.heerkirov.hedge.server.exceptions.NotFound
import com.heerkirov.hedge.server.exceptions.ResourceNotExist
import com.heerkirov.hedge.server.exceptions.be
import org.ktorm.dsl.*
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import java.time.Instant

class SourceMarkService(private val appdata: AppDataManager, private val data: DataRepository) {
    fun getMarks(site: String, sourceId: Long): List<SourceMarkRes> {
        val sourceDataId = data.db.from(SourceDatas)
            .select(SourceDatas.id)
            .where { (SourceDatas.sourceSite eq site) and (SourceDatas.sourceId eq sourceId) }
            .map { it[SourceDatas.id]!! }
            .firstOrNull()
            ?: throw be(NotFound())

        val titles = appdata.setting.source.sites.associate { it.name to it.title }

        return data.db.from(SourceMarks)
            .innerJoin(SourceDatas, SourceDatas.id eq SourceMarks.relatedSourceDataId)
            .select(SourceMarks.markType, SourceDatas.sourceSite, SourceDatas.sourceId)
            .where { SourceMarks.sourceDataId eq sourceDataId }
            .map { row ->
                val markType = row[SourceMarks.markType]!!
                val rowSite = row[SourceDatas.sourceSite]!!
                val rowSourceId = row[SourceDatas.sourceId]!!
                val rowTitle = titles.getOrDefault(rowSite, rowSite)
                SourceMarkRes(rowSite, rowTitle, rowSourceId, markType)
            }
    }

    /**
     * @throws ResourceNotExist ("related", number) 选择的操作对象并不存在
     */
    fun partialUpdateMarks(site: String, sourceId: Long, form: SourceMarkPartialUpdateForm) {
        data.db.transaction {
            val sourceDataId = data.db.from(SourceDatas)
                .select(SourceDatas.id)
                .where { (SourceDatas.sourceSite eq site) and (SourceDatas.sourceId eq sourceId) }
                .map { it[SourceDatas.id]!! }
                .firstOrNull()
                ?: throw be(NotFound())

            val targetSourceDataId = data.db.from(SourceDatas)
                .select(SourceDatas.id)
                .where { (SourceDatas.sourceSite eq form.sourceSite) and (SourceDatas.sourceId eq form.sourceId) }
                .map { it[SourceDatas.id]!! }
                .firstOrNull()
                ?: throw be(ResourceNotExist("related", form.sourceId))

            when (form.action) {
                SourceMarkPartialUpdateForm.Action.UPSERT -> {
                    val now = Instant.now()
                    if(data.db.sequenceOf(SourceMarks).firstOrNull { (it.sourceDataId eq sourceDataId) and (it.relatedSourceDataId eq targetSourceDataId) } != null) {
                        data.db.update(SourceMarks) {
                            where { (it.sourceDataId eq sourceDataId) and (it.relatedSourceDataId eq targetSourceDataId) }
                            set(it.recordTime, now)
                            set(it.markType, form.markType)
                        }
                        data.db.update(SourceMarks) {
                            where { (it.sourceDataId eq targetSourceDataId) and (it.relatedSourceDataId eq sourceDataId) }
                            set(it.recordTime, now)
                            set(it.markType, form.markType)
                        }
                    }else{
                        data.db.insert(SourceMarks) {
                            set(it.markType, form.markType)
                            set(it.sourceDataId, sourceDataId)
                            set(it.relatedSourceDataId, targetSourceDataId)
                            set(it.recordTime, now)
                        }
                        data.db.insert(SourceMarks) {
                            set(it.markType, form.markType)
                            set(it.sourceDataId, targetSourceDataId)
                            set(it.relatedSourceDataId, sourceDataId)
                            set(it.recordTime, now)
                        }
                    }
                }
                SourceMarkPartialUpdateForm.Action.REMOVE -> {
                    if(data.db.delete(SourceMarks) { (it.sourceDataId eq sourceDataId) and (it.relatedSourceDataId eq targetSourceDataId)} <= 0) {
                        throw be(ResourceNotExist("related", form.sourceId))
                    }
                    data.db.delete(SourceMarks) { (it.sourceDataId eq targetSourceDataId) and (it.relatedSourceDataId eq sourceDataId)}
                }
            }
        }
    }
}