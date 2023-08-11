package com.heerkirov.hedge.server.functions.kit

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.enums.MetaType
import com.heerkirov.hedge.server.exceptions.AlreadyExists
import com.heerkirov.hedge.server.exceptions.ParamError
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.model.Annotation
import com.heerkirov.hedge.server.utils.business.checkTagName
import com.heerkirov.hedge.server.utils.composition.unionComposition
import com.heerkirov.hedge.server.utils.ktorm.asSequence
import com.heerkirov.hedge.server.utils.runIf
import org.ktorm.dsl.*
import org.ktorm.entity.any
import org.ktorm.entity.sequenceOf

class AnnotationKit(private val data: DataRepository) {
    /**
     * 校验并纠正name，同时对name进行查重。name在同一种type下不允许重复。
     * @param thisId 指定此参数时，表示是在对一个项进行更新，此时绕过此id的记录的重名。
     * @throws AlreadyExists ("Annotation", "name", string) 此名称的annotation已存在
     */
    fun validateName(newName: String, type: MetaType, thisId: Int? = null): String {
        val trimName = newName.trim()

        if(!checkTagName(trimName)) throw be(ParamError("name"))
        if(data.db.sequenceOf(Annotations).any { (it.type eq type) and (it.name eq trimName).runIf(thisId != null) { and (it.id notEq thisId!!) } })
            throw be(AlreadyExists("Annotation", "name", trimName))

        return trimName
    }

    /**
     * 校验并纠正target。target只允许限定在type的范围之内。空的target会被设定为type范围下的完全target。
     * @throws ParamError ("")
     */
    fun validateTarget(newTarget: Annotation.AnnotationTarget, type: MetaType): Annotation.AnnotationTarget {
        val fullTarget = when(type) {
            MetaType.TAG -> Annotation.AnnotationTarget.tagElements.unionComposition()
            MetaType.TOPIC -> Annotation.AnnotationTarget.topicElements.unionComposition()
            MetaType.AUTHOR -> Annotation.AnnotationTarget.authorElements.unionComposition()
        }
        if(newTarget.isEmpty()) {
            return fullTarget
        }
        if(!(newTarget - fullTarget).isEmpty()) throw be(ParamError("target"))
        return newTarget
    }

    /**
     * 更新与此annotation关联的author/topic的annotation cache，删除当前注解。
     */
    fun updateAnnotationCacheForDelete(annotationId: Int) {
        val authors = data.db.from(Authors)
            .innerJoin(AuthorAnnotationRelations, AuthorAnnotationRelations.authorId eq Authors.id)
            .select(Authors.id, Authors.cachedAnnotations)
            .where { AuthorAnnotationRelations.annotationId eq annotationId }
            .asSequence()
            .map { Pair(it[Authors.id]!!, it[Authors.cachedAnnotations]!!) }
            .map { (id, cache) -> Pair(id, cache.filter { it.id != annotationId }) }
            .toMap()
        if(authors.isNotEmpty()) {
            data.db.batchUpdate(Authors) {
                for ((id, cache) in authors) {
                    item {
                        where { it.id eq id }
                        set(it.cachedAnnotations, cache)
                    }
                }
            }
        }

        val topics = data.db.from(Topics)
            .innerJoin(TopicAnnotationRelations, TopicAnnotationRelations.topicId eq Topics.id)
            .select(Topics.id, Topics.cachedAnnotations)
            .where { TopicAnnotationRelations.annotationId eq annotationId }
            .asSequence()
            .map { Pair(it[Topics.id]!!, it[Topics.cachedAnnotations]!!) }
            .map { (id, cache) -> Pair(id, cache.filter { it.id != annotationId }) }
            .toMap()
        if(topics.isNotEmpty()) {
            data.db.batchUpdate(Topics) {
                for ((id, cache) in topics) {
                    item {
                        where { it.id eq id }
                        set(it.cachedAnnotations, cache)
                    }
                }
            }
        }
    }
}