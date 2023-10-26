package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.NoteRecords
import com.heerkirov.hedge.server.dto.filter.NoteFilter
import com.heerkirov.hedge.server.dto.form.NoteCreateForm
import com.heerkirov.hedge.server.dto.form.NoteUpdateForm
import com.heerkirov.hedge.server.dto.res.ListResult
import com.heerkirov.hedge.server.enums.NoteStatus
import com.heerkirov.hedge.server.events.NoteCreated
import com.heerkirov.hedge.server.events.NoteDeleted
import com.heerkirov.hedge.server.events.NoteUpdated
import com.heerkirov.hedge.server.exceptions.NotFound
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.model.NoteRecord
import com.heerkirov.hedge.server.utils.business.toListResult
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.types.anyOpt
import org.ktorm.dsl.*
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import java.time.Instant

class NoteService(private val data: DataRepository, private val bus: EventBus) {
    private val orderTranslator = OrderTranslator {
        "status" to NoteRecords.status
        "createTime" to NoteRecords.createTime
        "updateTime" to NoteRecords.updateTime
    }

    fun list(filter: NoteFilter): ListResult<NoteRecord> {
        return data.db.from(NoteRecords)
            .select()
            .whereWithConditions {
                if(filter.status != null) it += NoteRecords.status inList filter.status
                if(filter.deleted != null) it += NoteRecords.deleted eq filter.deleted
            }
            .orderBy(orderTranslator, filter.order)
            .limit(filter.offset, filter.limit)
            .toListResult { NoteRecords.createEntity(it) }
    }

    fun create(form: NoteCreateForm): Int {
        data.db.transaction {
            val now = Instant.now()
            val id = data.db.insertAndGenerateKey(NoteRecords) {
                set(it.title, form.title)
                set(it.content, form.content)
                set(it.status, form.status ?: NoteStatus.GENERAL)
                set(it.deleted, false)
                set(it.createTime, now)
                set(it.updateTime, now)
            } as Int

            bus.emit(NoteCreated(id, form.status ?: NoteStatus.GENERAL))

            return id
        }
    }

    fun get(id: Int): NoteRecord {
        return data.db.sequenceOf(NoteRecords).firstOrNull { it.id eq id } ?: throw be(NotFound())
    }

    fun update(id: Int, form: NoteUpdateForm) {
        data.db.transaction {
            val note = data.db.sequenceOf(NoteRecords).firstOrNull { it.id eq id } ?: throw be(NotFound())

            if(anyOpt(form.title, form.content, form.status, form.deleted)) {
                data.db.update(NoteRecords) {
                    where { it.id eq id }
                    form.title.applyOpt { set(it.title, this) }
                    form.content.applyOpt { set(it.content, this) }
                    form.status.applyOpt { set(it.status, this) }
                    form.deleted.applyOpt { set(it.deleted, this) }
                    set(it.updateTime, Instant.now())
                }

                bus.emit(NoteUpdated(id, form.status.unwrapOr { note.status }, form.deleted.unwrapOr { note.deleted }))
            }
        }
    }

    fun delete(id: Int) {
        data.db.transaction {
            val note = data.db.sequenceOf(NoteRecords).firstOrNull { it.id eq id } ?: throw be(NotFound())
            data.db.delete(NoteRecords) { it.id eq id }

            bus.emit(NoteDeleted(id, note.status, note.deleted))
        }
    }
}