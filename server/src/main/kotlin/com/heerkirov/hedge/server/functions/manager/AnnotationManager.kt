package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.Annotations
import com.heerkirov.hedge.server.model.Annotation
import com.heerkirov.hedge.server.exceptions.*
import org.ktorm.dsl.*
import org.ktorm.entity.filter
import org.ktorm.entity.sequenceOf
import org.ktorm.entity.toList

class AnnotationManager(private val data: DataRepository) {
    /**
     * 解析一个由string和int组成的annotations列表，对其校验、纠错，并返回一个等价的、包含id和name的集合。
     * @throws ResourceNotExist (paramName, number[]) 有annotation不存在时，抛出此异常。给出不存在的annotation id列表
     * @throws ResourceNotSuitable (paramName, number[]) 指定target类型且有元素不满足此类型时，抛出此异常。给出不适用的annotation id列表
     */
    fun analyseAnnotationParam(annotations: List<Any>, target: Annotation.AnnotationTarget? = null, paramName: String = "annotations"): Map<Int, String> {
        if(annotations.any { it !is Int && it !is String }) {
            throw be(ParamTypeError(paramName, " must be id(Int) or name(String)."))
        }
        val ids = annotations.filterIsInstance<Int>()
        val names = annotations.filterIsInstance<String>()

        val resultFromIds = data.db.sequenceOf(Annotations)
            .filter { Annotations.id inList ids }
            .toList()
            .also { rows ->
                if(rows.size < ids.size) {
                    val minus = ids.toSet() - rows.asSequence().map { it.id }.toSet()
                    throw be(ResourceNotExist(paramName, minus))
                }
            }.also { rows ->
                rows.filter { target != null && !it.target.isEmpty() && !it.target.any(target) }.takeIf { it.isNotEmpty() }?.let {
                    throw be(ResourceNotSuitable(paramName, it.map { a -> a.id }))
                }
            }.map { Pair(it.id, it.name) }

        val resultFromNames = data.db.sequenceOf(Annotations)
            .filter { Annotations.name inList names }
            .toList()
            .also { rows ->
                if(rows.size < names.size) {
                    val minus = names.toSet() - rows.asSequence().map { it.name }.toSet()
                    throw be(ResourceNotExist(paramName, minus))
                }
            }.also { rows ->
                rows.filter { target != null && !it.target.isEmpty() && target !in it.target }.takeIf { it.isNotEmpty() }?.let {
                    throw be(ResourceNotSuitable(paramName, it.map { a -> a.id }))
                }
            }
            .map { Pair(it.id, it.name) }

        return (resultFromIds + resultFromNames).toMap()
    }
}