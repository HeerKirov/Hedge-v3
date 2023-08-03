package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.exceptions.NotFound
import com.heerkirov.hedge.server.dto.filter.AnnotationFilter
import com.heerkirov.hedge.server.dto.form.AnnotationCreateForm
import com.heerkirov.hedge.server.dto.form.AnnotationUpdateForm
import com.heerkirov.hedge.server.dto.res.AnnotationRes
import com.heerkirov.hedge.server.dto.res.ListResult
import com.heerkirov.hedge.server.dto.res.newAnnotationRes
import com.heerkirov.hedge.server.utils.business.toListResult
import com.heerkirov.hedge.server.events.AnnotationCreated
import com.heerkirov.hedge.server.events.AnnotationDeleted
import com.heerkirov.hedge.server.events.AnnotationUpdated
import com.heerkirov.hedge.server.exceptions.AlreadyExists
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.functions.kit.AnnotationKit
import com.heerkirov.hedge.server.functions.manager.query.QueryManager
import com.heerkirov.hedge.server.utils.DateTime
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.types.anyOpt
import com.heerkirov.hedge.server.utils.ktorm.compositionContains
import com.heerkirov.hedge.server.utils.ktorm.compositionEmpty
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.runIf
import com.heerkirov.hedge.server.utils.types.ascendingOrderItem
import org.ktorm.dsl.*
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf

class AnnotationService(private val data: DataRepository, private val bus: EventBus, private val kit: AnnotationKit, private val queryManager: QueryManager) {
    private val orderTranslator = OrderTranslator {
        "id" to Annotations.id
        "name" to Annotations.name
        "createTime" to Annotations.createTime
    }

    fun list(filter: AnnotationFilter): ListResult<AnnotationRes> {
        val schema = if(filter.query.isNullOrBlank()) null else {
            queryManager.querySchema(filter.query, QueryManager.Dialect.ANNOTATION).executePlan ?: return ListResult(0, emptyList())
        }
        return data.db.from(Annotations)
            .let { schema?.joinConditions?.fold(it) { acc, join -> if(join.left) acc.leftJoin(join.table, join.condition) else acc.innerJoin(join.table, join.condition) } ?: it }
            .select()
            .whereWithConditions {
                it += Annotations.type eq filter.type
                if(filter.name != null) { it += Annotations.name eq filter.name }
                if(filter.canBeExported != null) { it += Annotations.canBeExported eq filter.canBeExported }
                if(filter.target != null) { it += (Annotations.target compositionContains filter.target) or Annotations.target.compositionEmpty() }
                if(schema != null && schema.whereConditions.isNotEmpty()) {
                    it.addAll(schema.whereConditions)
                }
            }
            .runIf(schema?.distinct == true) { groupBy(Annotations.id) }
            .limit(filter.offset, filter.limit)
            .orderBy(orderTranslator, filter.order, schema?.orderConditions, default = ascendingOrderItem("id"))
            .toListResult { newAnnotationRes(Annotations.createEntity(it)) }
    }

    /**
     * @throws AlreadyExists ("Annotation", "name", string) 此名称的annotation已存在
     */
    fun create(form: AnnotationCreateForm): Int {
        data.db.transaction {
            val createTime = DateTime.now()
            val name = kit.validateName(form.name, form.type)
            val target = kit.validateTarget(form.target, form.type)
            val id = data.db.insertAndGenerateKey(Annotations) {
                set(it.name, name)
                set(it.canBeExported, form.canBeExported)
                set(it.type, form.type)
                set(it.target, target)
                set(it.createTime, createTime)
            } as Int

            bus.emit(AnnotationCreated(id, form.type))

            return id
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun get(id: Int): AnnotationRes {
        return data.db.sequenceOf(Annotations).firstOrNull { it.id eq id }
            ?.let { newAnnotationRes(it) }
            ?: throw be(NotFound())
    }

    /**
     * @throws NotFound 请求对象不存在
     * @throws AlreadyExists ("Annotation", "name", string) 此名称的annotation已存在
     */
    fun update(id: Int, form: AnnotationUpdateForm) {
        data.db.transaction {
            val a = data.db.sequenceOf(Annotations).firstOrNull { it.id eq id } ?: throw be(NotFound())

            val newName = form.name.letOpt { kit.validateName(it, a.type, id) }
            val newTarget = form.target.letOpt { kit.validateTarget(it, a.type) }
            if(anyOpt(newName, form.canBeExported, form.target)) {
                data.db.update(Annotations) {
                    where { it.id eq id }

                    newName.applyOpt { set(it.name, this) }
                    newTarget.applyOpt { set(it.target, this) }
                    form.canBeExported.applyOpt { set(it.canBeExported, this) }
                }

                bus.emit(AnnotationUpdated(id, a.type))
            }
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun delete(id: Int) {
        data.db.transaction {
            val a = data.db.sequenceOf(Annotations).firstOrNull { it.id eq id } ?: throw be(NotFound())
            data.db.delete(Annotations) { it.id eq id }
            data.db.delete(IllustAnnotationRelations) { it.annotationId eq id }
            data.db.delete(BookAnnotationRelations) { it.annotationId eq id }
            data.db.delete(TagAnnotationRelations) { it.annotationId eq id }

            kit.updateAnnotationCacheForDelete(id)
            data.db.delete(AuthorAnnotationRelations) { it.annotationId eq id }
            data.db.delete(TopicAnnotationRelations) { it.annotationId eq id }

            bus.emit(AnnotationDeleted(id, a.type))
        }
    }
}