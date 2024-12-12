package com.heerkirov.hedge.server.functions.kit

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.Illusts
import com.heerkirov.hedge.server.dao.Tags
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.enums.TagAddressType
import com.heerkirov.hedge.server.exceptions.ParamError
import com.heerkirov.hedge.server.exceptions.ResourceNotExist
import com.heerkirov.hedge.server.exceptions.ResourceNotSuitable
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.model.Tag
import com.heerkirov.hedge.server.utils.business.checkTagName
import org.ktorm.dsl.eq
import org.ktorm.dsl.inList
import org.ktorm.entity.filter
import org.ktorm.entity.first
import org.ktorm.entity.sequenceOf
import org.ktorm.entity.toList
import java.util.*

class TagKit(private val data: DataRepository) {
    /**
     * 校验并纠正name。
     */
    fun validateName(newName: String): String {
        return newName.trim().apply {
            if(!checkTagName(this)) throw be(ParamError("name"))
        }
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
     * 校验并纠正links。tag的link必须是非虚拟的。
     * @throws ResourceNotExist ("links", number[]) links中给出的tag不存在。给出不存在的link id列表
     * @throws ResourceNotSuitable ("links", number[]) links中给出的部分资源不适用，虚拟地址段是不能被link的。给出不适用的link id列表
     */
    fun validateLinks(newLinks: List<Int>?): List<Int>? {
        return if(newLinks.isNullOrEmpty()) null else {
            val links = data.db.sequenceOf(Tags).filter { it.id inList newLinks }.toList()

            if(links.size < newLinks.size) {
                throw be(ResourceNotExist("links", newLinks.toSet() - links.asSequence().map { it.id }.toSet()))
            }

            val wrongLinks = links.filter { it.type == TagAddressType.VIRTUAL_ADDR }
            if(wrongLinks.isNotEmpty()) {
                throw be(ResourceNotSuitable("links", wrongLinks.map { it.id }))
            }

            newLinks
        }
    }

    /**
     * 校验并纠正examples。
     * @throws ResourceNotExist ("examples", number[]) examples中给出的image不存在。给出不存在的image id列表
     * @throws ResourceNotSuitable ("examples", number[]) examples中给出的部分资源不适用，collection不能用作example。给出不适用的link id列表
     */
    fun validateExamples(newExamples: List<Int>?): List<Int>? {
        return if(newExamples.isNullOrEmpty()) null else {
            val examples = data.db.sequenceOf(Illusts).filter { it.id inList newExamples }.toList()
            if (examples.size < newExamples.size) {
                throw be(ResourceNotExist("examples", newExamples.toSet() - examples.asSequence().map { it.id }.toSet()))
            }
            examples.filter { it.type == IllustModelType.COLLECTION }.let {
                if(it.isNotEmpty()) {
                    throw be(ResourceNotSuitable("examples", it.map { i -> i.id }))
                }
            }

            newExamples
        }
    }

    /**
     * 从给出的tag开始向上请求，拿到它的所有parent address。最终结果不包括初始tag。address的顺序是root在最前，直接父标签在最后。
     */
    fun getAllParents(tag: Tag): List<Tag> {
        if(tag.parentId == null) {
            return emptyList()
        }

        val ret = LinkedList<Tag>()
        var current = tag
        while (current.parentId != null) {
            val next = data.db.sequenceOf(Tags).first { it.id eq current.parentId!! }
            ret.push(next)
            current = next
        }

        return ret
    }
}