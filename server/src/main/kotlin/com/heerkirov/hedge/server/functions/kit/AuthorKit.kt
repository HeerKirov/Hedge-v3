package com.heerkirov.hedge.server.functions.kit

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.Authors
import com.heerkirov.hedge.server.exceptions.AlreadyExists
import com.heerkirov.hedge.server.exceptions.ParamError
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.utils.Texture
import com.heerkirov.hedge.server.utils.business.checkTagName
import com.heerkirov.hedge.server.utils.runIf
import org.ktorm.dsl.and
import org.ktorm.dsl.eq
import org.ktorm.dsl.notEq
import org.ktorm.entity.any
import org.ktorm.entity.sequenceOf

class AuthorKit(private val data: DataRepository) {
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
        return newOtherNames.let { if(it.isNullOrEmpty()) emptyList() else it.map(String::trim).filter(String::isNotEmpty).distinct() }.apply {
            if(any { !checkTagName(it) }) throw be(ParamError("otherNames"))
        }
    }

    /**
     * 校验并纠正keywords。
     */
    fun validateKeywords(newKeywords: List<String>?): List<String> {
        return newKeywords.let { if(it.isNullOrEmpty()) emptyList() else it.map(String::trim).filter(String::isNotEmpty).distinct() }.apply {
            if(any { !checkTagName(it) }) throw be(ParamError("keywords"))
        }
    }

    /**
     * 根据name和otherNames生成新的隐式名称列表。
     */
    fun generateImplicitNames(name: String, otherNames: List<String>): List<String> {
        val names = if(name in otherNames) otherNames else (otherNames + name)
        val filtered = names.filter { Texture.containChinese(it) }
        return (filtered.map { Texture.toPinyin(it) } + filtered.map { Texture.toPinyinInitials(it) }).filter { it !in names }.distinct()
    }
}