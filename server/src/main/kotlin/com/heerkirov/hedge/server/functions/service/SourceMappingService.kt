package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dto.form.SourceMappingBatchQueryForm
import com.heerkirov.hedge.server.dto.res.SourceMappingBatchQueryResult
import com.heerkirov.hedge.server.dto.res.SourceMappingTargetItem
import com.heerkirov.hedge.server.dto.res.SourceMappingTargetItemDetail
import com.heerkirov.hedge.server.exceptions.ResourceNotExist
import com.heerkirov.hedge.server.functions.manager.SourceMappingManager

class SourceMappingService(private val data: DataRepository, private val sourceMappingManager: SourceMappingManager) {
    fun batchQuery(form: SourceMappingBatchQueryForm): List<SourceMappingBatchQueryResult> {
        return sourceMappingManager.batchQuery(form)
    }

    fun query(site: String, tagCode: String): List<SourceMappingTargetItemDetail> {
        return sourceMappingManager.query(site, tagCode)
    }

    /**
     * @throws ResourceNotExist ("site", string) 给出的site不存在
     * @throws ResourceNotExist ("authors" | "topics" | "tags", number[]) 给出的meta tag不存在
     */
    fun update(site: String, tagCode: String, form: List<SourceMappingTargetItem>) {
        data.db.transaction {
            sourceMappingManager.update(site, tagCode, form)
        }
    }

    /**
     * @throws ResourceNotExist ("site", string) 给出的site不存在
     */
    fun delete(site: String, tagCode: String) {
        data.db.transaction {
            sourceMappingManager.update(site, tagCode, emptyList())
        }
    }
}