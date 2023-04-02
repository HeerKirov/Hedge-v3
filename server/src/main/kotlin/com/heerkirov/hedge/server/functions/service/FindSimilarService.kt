package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.backend.similar.SimilarFinder
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.FindSimilarTasks
import com.heerkirov.hedge.server.dto.filter.FindSimilarTaskQueryFilter
import com.heerkirov.hedge.server.dto.filter.LimitAndOffsetFilter
import com.heerkirov.hedge.server.dto.form.FindSimilarTaskCreateForm
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.manager.IllustExtendManager
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.types.descendingOrderItem
import org.ktorm.dsl.*
import org.ktorm.entity.*

class FindSimilarService(private val data: DataRepository,
                         private val illustExtendManager: IllustExtendManager,
                         private val finder: SimilarFinder) {
    private val taskOrderTranslator = OrderTranslator {
        "id" to FindSimilarTasks.id
        "recordTime" to FindSimilarTasks.recordTime
    }

    fun listTask(filter: FindSimilarTaskQueryFilter): ListResult<FindSimilarTaskRes> {
        return data.db.from(FindSimilarTasks)
            .select()
            .limit(filter.offset, filter.limit)
            .orderBy(taskOrderTranslator, filter.order, default = descendingOrderItem("recordTime"))
            .toListResult { newFindSimilarTaskRes(FindSimilarTasks.createEntity(it)) }
    }

    fun createTask(form: FindSimilarTaskCreateForm): Int {
        data.db.transaction {
            return finder.add(form.selector, form.config)
        }
    }

    /**
     * @throws NotFound
     */
    fun getTask(id: Int): FindSimilarTaskRes {
        val task = data.db.sequenceOf(FindSimilarTasks).firstOrNull { it.id eq id } ?: throw be(NotFound())
        return newFindSimilarTaskRes(task)
    }

    /**
     * @throws NotFound
     */
    fun deleteTask(id: Int) {
        data.db.transaction {
            finder.delete(id)
        }
    }

    fun listResult(filter: LimitAndOffsetFilter): ListResult<FindSimilarResultRes> {
        TODO()
    }
}