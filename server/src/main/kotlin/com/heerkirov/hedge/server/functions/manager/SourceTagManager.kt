package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.SourceTags
import com.heerkirov.hedge.server.dto.form.SourceTagForm
import com.heerkirov.hedge.server.dto.res.SourceTagDto
import com.heerkirov.hedge.server.dto.res.SourceTagPath
import com.heerkirov.hedge.server.events.SourceTagUpdated
import com.heerkirov.hedge.server.exceptions.ResourceNotExist
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.model.SourceTag
import com.heerkirov.hedge.server.utils.ktorm.first
import com.heerkirov.hedge.server.utils.toAlphabetLowercase
import org.ktorm.dsl.*
import org.ktorm.entity.filter
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import org.ktorm.entity.toList

class SourceTagManager(private val appdata: AppDataManager, private val data: DataRepository, private val bus: EventBus) {
    /**
     * 校验source的合法性。
     * @throws ResourceNotExist ("site", string) 给出的source不存在
     */
    fun checkSourceSite(site: String) {
        appdata.setting.source.sites.firstOrNull { it.name == site } ?: throw be(ResourceNotExist("site", site))
    }

    /**
     * 查询目标source tag，或在它不存在时创建它，将其余属性留空。
     */
    fun getOrCreateSourceTag(sourceSite: String, sourceTagType: String, sourceTagCode: String): SourceTag {
        return data.db.sequenceOf(SourceTags)
            .firstOrNull { (it.site eq sourceSite) and (it.type eq sourceTagType) and (it.code eq sourceTagCode) }
            ?: run {
                val site = appdata.setting.source.sites.firstOrNull { it.name == sourceSite } ?: throw be(ResourceNotExist("site", sourceSite))
                if(site.availableTypes.indexOf(sourceTagType) < 0) throw be(ResourceNotExist("sourceTagType", site))

                val id = data.db.insertAndGenerateKey(SourceTags) {
                    set(it.site, sourceSite)
                    set(it.type, sourceTagType)
                    set(it.code, sourceTagCode)
                    set(it.name, sourceTagCode)
                    set(it.otherName, null)
                } as Int

                val verifyId = data.db.from(SourceTags).select(max(SourceTags.id).aliased("id")).first().getInt("id")
                if(verifyId != id) {
                    throw RuntimeException("SourceTag insert failed. generatedKey is $id but queried verify id is $verifyId.")
                }

                bus.emit(SourceTagUpdated(sourceSite, sourceTagType, sourceTagCode))

                SourceTag(id, sourceSite, sourceTagType, sourceTagCode, sourceTagCode, null)
            }
    }

    /**
     * 在image的source update方法中，根据给出的tags dto，创建或修改数据库里的source tag model，并返回这些模型的id。
     * 这个方法的逻辑是，source tags总是基于其name做唯一定位，当name不变时，修改其他属性视为更新，而改变name即认为是不同的对象。
     * 不会校验source的合法性，因为假设之前已经手动校验过了。
     */
    fun getAndUpsertSourceTags(sourceSite: String, tags: List<SourceTagForm>): List<Int> {
        val site = appdata.setting.source.sites.firstOrNull { it.name == sourceSite } ?: throw be(ResourceNotExist("site", sourceSite))
        tags.asSequence().map { it.type }.distinct().firstOrNull { site.availableTypes.indexOf(it) < 0 }?.let { throw be(ResourceNotExist("sourceTagType", it)) }

        val dbTags = tags.groupBy ({ it.type }) { it.code }.flatMap { (type, codes) -> data.db.sequenceOf(SourceTags).filter { (it.site eq sourceSite) and (it.type eq type) and (it.code inList codes) }.toList() }
        val dbTagMap = dbTags.associateBy { Pair(it.type, it.code.toAlphabetLowercase()) }
        val tagMap = tags.associateBy { Pair(it.type, it.code.toAlphabetLowercase()) }

        //挑选出目前在数据库里没有的tag
        val toBeAdd = tagMap.keys - dbTagMap.keys
        if(toBeAdd.isNotEmpty()) {
            data.db.batchInsert(SourceTags) {
                for (key in toBeAdd) {
                    val tag = tagMap[key]!!
                    item {
                        set(it.site, sourceSite)
                        set(it.code, tag.code)
                        set(it.name, tag.name.unwrapOr { tag.code })
                        set(it.otherName, tag.otherName.unwrapOrNull())
                        set(it.type, tag.type)
                    }
                }
            }
        }

        //挑选出在数据库里有，但是发生了变化的tag
        val toBeModify = tagMap.keys.intersect(dbTagMap.keys).filter { key ->
            val form = tagMap[key]!!
            if(form.otherName.isPresent || form.name.isPresent) {
                val dto = dbTagMap[key]!!.run { SourceTagDto(code, type, name, otherName) }
                form.otherName.letOpt { it != dto.otherName }.unwrapOr { false } || form.name.letOpt { it != dto.name }.unwrapOr { false }
            }else{
                false
            }
        }
        if(toBeModify.isNotEmpty()) {
            for (name in toBeModify) {
                val tag = tagMap[name]!!
                val dbTag = dbTagMap[name]!!
                data.db.update(SourceTags) {
                    where { it.id eq dbTag.id }
                    tag.name.applyOpt { set(it.name, this) }
                    tag.otherName.applyOpt { set(it.otherName, this) }
                }
            }
        }

        toBeAdd.forEach { bus.emit(SourceTagUpdated(sourceSite, it.first, it.second)) }
        toBeModify.forEach { bus.emit(SourceTagUpdated(sourceSite, it.first, it.second)) }

        return tags.groupBy ({ it.type }) { it.code }.flatMap { (type, codes) ->
            data.db.from(SourceTags).select(SourceTags.id)
                .where { (SourceTags.site eq sourceSite) and (SourceTags.type eq type) and (SourceTags.code inList codes) }
                .map { it[SourceTags.id]!! }
        }
    }

    /**
     * 查询一组sourceTagPath所对应的sourceTag。
     */
    fun getSourceTagIdByPaths(sourceTags: List<SourceTagPath>): Map<SourceTagPath, SourceTag> {
        return sourceTags
            .groupBy({ Pair(it.sourceSite, it.sourceTagType) }) { it.sourceTagCode }
            .flatMap { (e, codes) ->
                val (site, type) = e
                data.db.sequenceOf(SourceTags).filter { (it.site eq site) and (it.type eq type) and (it.code inList codes) }.toList()
            }.associateBy { SourceTagPath(it.site, it.type, it.code) }
    }
}