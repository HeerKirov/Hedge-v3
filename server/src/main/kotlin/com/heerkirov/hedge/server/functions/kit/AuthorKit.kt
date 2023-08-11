package com.heerkirov.hedge.server.functions.kit

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.AuthorAnnotationRelations
import com.heerkirov.hedge.server.dao.Authors
import com.heerkirov.hedge.server.enums.TagAuthorType
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.manager.AnnotationManager
import com.heerkirov.hedge.server.model.Author
import com.heerkirov.hedge.server.model.Annotation
import com.heerkirov.hedge.server.utils.business.checkTagName
import com.heerkirov.hedge.server.utils.composition.unionComposition
import com.heerkirov.hedge.server.utils.ktorm.asSequence
import com.heerkirov.hedge.server.utils.runIf
import org.ktorm.dsl.*
import org.ktorm.entity.any
import org.ktorm.entity.sequenceOf

class AuthorKit(private val data: DataRepository, private val annotationManager: AnnotationManager) {
    /**
     * 校验并纠正name，同时对name进行查重。
     * @param thisId 指定此参数时，表示是在对一个项进行更新，此时绕过此id的记录的重名。
     * @throws AlreadyExists ("Author", "name", string) 此名称的author已存在
     */
    fun validateName(newName: String, thisId: Int? = null): String {
        val trimName = newName.trim()

        if(!checkTagName(trimName)) throw be(ParamError("name"))
        if(data.db.sequenceOf(Authors).any { (it.name eq trimName).runIf(thisId != null) { and (it.id notEq thisId!!) } })
            throw be(AlreadyExists("Author", "name", trimName))

        return trimName
    }

    /**
     * 校验并纠正otherNames。
     */
    fun validateOtherNames(newOtherNames: List<String>?): List<String> {
        return newOtherNames.let { if(it.isNullOrEmpty()) emptyList() else it.map(String::trim) }.apply {
            if(any { !checkTagName(it) }) throw be(ParamError("otherNames"))
        }
    }

    /**
     * 校验并纠正keywords。
     */
    fun validateKeywords(newKeywords: List<String>?): List<String> {
        return newKeywords.let { if(it.isNullOrEmpty()) emptyList() else it.map(String::trim) }.apply {
            if(any { !checkTagName(it) }) throw be(ParamError("keywords"))
        }
    }

    /**
     * 检验给出的annotations参数的正确性，返回全量表。
     * @throws ResourceNotExist ("annotations", number[]) 有annotation不存在时，抛出此异常。给出不存在的annotation id列表
     * @throws ResourceNotSuitable ("annotations", number[]) 指定target类型且有元素不满足此类型时，抛出此异常。给出不适用的annotation id列表
     */
    fun validateAnnotations(newAnnotations: List<Any>?, type: TagAuthorType): List<Author.CachedAnnotation> {
        return if(newAnnotations != null) annotationManager.analyseAnnotationParam(newAnnotations, target = when(type) {
            TagAuthorType.UNKNOWN -> Annotation.AnnotationTarget.authorElements.unionComposition()
            TagAuthorType.ARTIST -> Annotation.AnnotationTarget.ARTIST
            TagAuthorType.STUDIO -> Annotation.AnnotationTarget.STUDIO
            TagAuthorType.PUBLISH -> Annotation.AnnotationTarget.PUBLISH
        }).map { Author.CachedAnnotation(it.key, it.value) } else emptyList()
    }

    /**
     * 将annotations的全量表和旧值解析为adds和deletes，并执行增删。
     */
    fun processAnnotations(thisId: Int, annotationIds: Set<Int>, creating: Boolean = false) {
        val oldAnnotationIds = if(creating) emptySet() else {
            data.db.from(AuthorAnnotationRelations).select(AuthorAnnotationRelations.annotationId)
                .where { AuthorAnnotationRelations.authorId eq thisId }
                .asSequence()
                .map { it[AuthorAnnotationRelations.annotationId]!! }
                .toSet()
        }

        val deleteIds = oldAnnotationIds - annotationIds
        data.db.delete(AuthorAnnotationRelations) { (it.authorId eq thisId) and (it.annotationId inList deleteIds) }

        val addIds = annotationIds - oldAnnotationIds
        if(addIds.isNotEmpty()) data.db.batchInsert(AuthorAnnotationRelations) {
            for (addId in addIds) {
                item {
                    set(it.authorId, thisId)
                    set(it.annotationId, addId)
                }
            }
        }
    }
}