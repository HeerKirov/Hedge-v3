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

    fun query(site: String, tagName: String): List<SourceMappingTargetItemDetail> {
        return sourceMappingManager.query(site, tagName)
    }

    /**
     * @throws ResourceNotExist ("site", string) 给出的site不存在
     * @throws ResourceNotExist ("authors" | "topics" | "tags", number[]) 给出的meta tag不存在
     */
    fun update(site: String, tagName: String, form: List<SourceMappingTargetItem>) {
        data.db.transaction {
            sourceMappingManager.update(site, tagName, form)
        }
    }

    /**
     * @throws ResourceNotExist ("site", string) 给出的site不存在
     */
    fun delete(site: String, tagName: String) {
        data.db.transaction {
            sourceMappingManager.update(site, tagName, emptyList())
        }
    }
}