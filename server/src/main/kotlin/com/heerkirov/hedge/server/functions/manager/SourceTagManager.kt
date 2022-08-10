package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.SourceTags
import com.heerkirov.hedge.server.dto.form.SourceTagForm
import com.heerkirov.hedge.server.dto.res.SourceTagDto
import com.heerkirov.hedge.server.exceptions.ResourceNotExist
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.model.SourceTag
import org.ktorm.dsl.*
import org.ktorm.entity.filter
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import org.ktorm.entity.toList

class SourceTagManager(private val data: DataRepository) {
    /**
     * 校验source的合法性。
     * @throws ResourceNotExist ("site", string) 给出的source不存在
     */
    fun checkSourceSite(site: String) {
        data.setting.source.sites.firstOrNull { it.name == site } ?: throw be(ResourceNotExist("site", site))
    }

    /**
     * 查询目标source tag，或在它不存在时创建它，将其余属性留空。
     * 不会校验source的合法性，因为假设之前已经手动校验过了。
     */
    fun getOrCreateSourceTag(sourceSite: String, sourceTagCode: String): SourceTag {
        return data.db.sequenceOf(SourceTags)
            .firstOrNull { it.site eq sourceSite and (it.code eq sourceTagCode) }
            ?: run {
                val id = data.db.insertAndGenerateKey(SourceTags) {
                    set(it.site, sourceSite)
                    set(it.code, sourceTagCode)
                    set(it.name, sourceTagCode)
                    set(it.otherName, null)
                    set(it.type, null)
                } as Int
                SourceTag(id, sourceSite, sourceTagCode, sourceTagCode, null, null)
            }
    }

    /**
     * 在image的source update方法中，根据给出的tags dto，创建或修改数据库里的source tag model，并返回这些模型的id。
     * 这个方法的逻辑是，source tags总是基于其name做唯一定位，当name不变时，修改其他属性视为更新，而改变name即认为是不同的对象。
     * 不会校验source的合法性，因为假设之前已经手动校验过了。
     */
    fun getAndUpsertSourceTags(sourceSite: String, tags: List<SourceTagForm>): List<Int> {
        val tagMap = tags.associateBy { it.code }

        val dbTags = data.db.sequenceOf(SourceTags).filter { (it.site eq sourceSite) and (it.code inList tagMap.keys) }.toList()
        val dbTagMap = dbTags.associateBy { it.code }

        fun SourceTag.mapToDto() = SourceTagDto(code, name, otherName, type)

        //挑选出目前在数据库里没有的tag
        val minus = tagMap.keys - dbTagMap.keys
        if(minus.isNotEmpty()) {
            data.db.batchInsert(SourceTags) {
                for (code in minus) {
                    val tag = tagMap[code]!!
                    item {
                        set(it.site, sourceSite)
                        set(it.code, code)
                        set(it.name, tag.name.unwrapOrNull())
                        set(it.otherName, tag.otherName.unwrapOrNull())
                        set(it.type, tag.type.unwrapOrNull())
                    }
                }
            }
        }

        //挑选出在数据库里有，但是发生了变化的tag
        val common = tagMap.keys.intersect(dbTagMap.keys).filter { key ->
            val form = tagMap[key]!!
            if(form.type.isPresent || form.otherName.isPresent || form.name.isPresent) {
                val dto = dbTagMap[key]!!.mapToDto()
                form.type.letOpt { it != dto.type }.unwrapOr { false }
                        || form.otherName.letOpt { it != dto.otherName }.unwrapOr { false }
                        || form.name.letOpt { it != dto.name }.unwrapOr { false }
            }else{
                false
            }
        }
        if(common.isNotEmpty()) {
            data.db.batchUpdate(SourceTags) {
                for (name in common) {
                    val tag = tagMap[name]!!
                    val dbTag = dbTagMap[name]!!
                    item {
                        where { it.id eq dbTag.id }
                        tag.name.applyOpt { set(it.name, this) }
                        tag.otherName.applyOpt { set(it.otherName, this) }
                        tag.type.applyOpt { set(it.type, this) }
                    }
                }
            }
        }

        return data.db.from(SourceTags).select(SourceTags.id)
            .where { (SourceTags.site eq sourceSite) and (SourceTags.code inList tagMap.keys) }
            .map { it[SourceTags.id]!! }
    }
}