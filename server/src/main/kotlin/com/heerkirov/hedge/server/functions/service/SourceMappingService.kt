package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.Illusts
import com.heerkirov.hedge.server.dao.SourceTagRelations
import com.heerkirov.hedge.server.dao.SourceTags
import com.heerkirov.hedge.server.dto.res.SourceMappingBatchQueryResult
import com.heerkirov.hedge.server.dto.res.SourceMappingTargetItem
import com.heerkirov.hedge.server.dto.res.SourceMappingTargetItemDetail
import com.heerkirov.hedge.server.dto.res.SourceTagPath
import com.heerkirov.hedge.server.exceptions.ResourceNotExist
import com.heerkirov.hedge.server.functions.manager.IllustManager
import com.heerkirov.hedge.server.functions.manager.SourceMappingManager
import org.ktorm.dsl.*

class SourceMappingService(private val data: DataRepository, private val illustManager: IllustManager, private val sourceMappingManager: SourceMappingManager) {

    fun batchQueryByIllusts(illustIds: List<Int>): List<SourceMappingBatchQueryResult> {
        val imageIds = illustManager.unfoldImages(illustIds, sorted = false).map { it.id }
        val sourceTags = data.db.from(Illusts)
            .innerJoin(SourceTagRelations, SourceTagRelations.sourceDataId eq Illusts.sourceDataId)
            .innerJoin(SourceTags, SourceTags.id eq SourceTagRelations.sourceTagId)
            .select(SourceTags.site, SourceTags.type, SourceTags.code)
            .where { (Illusts.id inList imageIds) and (Illusts.sourceDataId.isNotNull()) }
            .groupBy(SourceTags.id)
            .map { SourceTagPath(it[SourceTags.site]!!, it[SourceTags.type]!!, it[SourceTags.code]!!) }

        return sourceMappingManager.batchQuery(sourceTags)
    }

    fun batchQuery(tags: List<SourceTagPath>): List<SourceMappingBatchQueryResult> {
        return sourceMappingManager.batchQuery(tags)
    }

    fun query(site: String, tagType: String, tagCode: String): List<SourceMappingTargetItemDetail> {
        return sourceMappingManager.query(site, tagType, tagCode)
    }

    /**
     * @throws ResourceNotExist ("site", string) 给出的site不存在
     * @throws ResourceNotExist ("authors" | "topics" | "tags", number[]) 给出的meta tag不存在
     */
    fun update(site: String, tagType: String, tagCode: String, form: List<SourceMappingTargetItem>) {
        data.db.transaction {
            sourceMappingManager.update(site, tagType, tagCode, form)
        }
    }

    /**
     * @throws ResourceNotExist ("site", string) 给出的site不存在
     */
    fun delete(site: String, tagType: String, tagCode: String) {
        data.db.transaction {
            sourceMappingManager.update(site, tagType, tagCode, emptyList())
        }
    }
}