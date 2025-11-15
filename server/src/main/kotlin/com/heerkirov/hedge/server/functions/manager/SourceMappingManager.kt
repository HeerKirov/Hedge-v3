package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.form.MappingSourceTagForm
import com.heerkirov.hedge.server.dto.form.SourceTagForm
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.ExportType
import com.heerkirov.hedge.server.enums.MetaType
import com.heerkirov.hedge.server.enums.TagAddressType
import com.heerkirov.hedge.server.events.SourceTagMappingUpdated
import com.heerkirov.hedge.server.exceptions.ResourceNotExist
import com.heerkirov.hedge.server.exceptions.NotFound
import com.heerkirov.hedge.server.exceptions.ParamRequired
import com.heerkirov.hedge.server.exceptions.be
import org.ktorm.dsl.*
import org.ktorm.entity.*
import org.ktorm.schema.Column

class SourceMappingManager(private val appdata: AppDataManager, private val data: DataRepository, private val bus: EventBus, private val sourceTagManager: SourceTagManager) {
    fun batchQuery(tagPaths: List<SourceTagPath>): List<SourceMappingBatchQueryResult> {
        val sourceTags = sourceTagManager.getSourceTagIdByPaths(tagPaths)

        val groups = data.db.from(SourceTagMappings)
            .innerJoin(SourceTags, (SourceTags.site eq SourceTagMappings.sourceSite) and (SourceTags.id eq SourceTagMappings.sourceTagId))
            .select(SourceTags.site, SourceTags.type, SourceTags.code, SourceTagMappings.targetMetaType, SourceTagMappings.targetMetaId)
            .where { SourceTagMappings.sourceTagId inList sourceTags.values.map { it.id } }
            .map {
                Pair(
                    SourceTagPath(it[SourceTags.site]!!, it[SourceTags.type]!!, it[SourceTags.code]!!),
                    SourceMappingTargetItem(it[SourceTagMappings.targetMetaType]!!, it[SourceTagMappings.targetMetaId]!!)
                )
            }.groupBy({ it.first }) { it.second }

        val allMappings = groups.flatMap { (_, mappings) -> mappings }.let(::mapTargetItemToDetail)

        return tagPaths.map { tagPath ->
            val mappingDetails = groups[tagPath]?.mapNotNull { allMappings[it] } ?: emptyList()
            val sourceTag = sourceTags[tagPath]!!
            val sourceTagDto = SourceTagDto(sourceTag.code, sourceTag.type, sourceTag.name, sourceTag.otherName)
            SourceMappingBatchQueryResult(tagPath.sourceSite, tagPath.sourceTagType, tagPath.sourceTagCode, sourceTagDto, mappingDetails)
        }
    }

    fun query(sourceSite: String, tagType: String, tagCode: String): List<SourceMappingTargetItemDetail> {
        return data.db.from(SourceTagMappings)
            .innerJoin(SourceTags, (SourceTags.site eq SourceTagMappings.sourceSite) and (SourceTags.id eq SourceTagMappings.sourceTagId))
            .select(SourceTagMappings.targetMetaType, SourceTagMappings.targetMetaId)
            .where { (SourceTags.site eq sourceSite) and (SourceTags.type eq tagType) and (SourceTags.code eq tagCode) }
            .map { row -> SourceMappingTargetItem(row[SourceTagMappings.targetMetaType]!!, row[SourceTagMappings.targetMetaId]!!) }
            .let { mapTargetItemToDetail(it).values.toList() }
    }

    fun query(metaType: MetaType, metaId: Int): List<MappingSourceTagDto> {
        return data.db.from(SourceTagMappings)
            .innerJoin(SourceTags, (SourceTags.site eq SourceTagMappings.sourceSite) and (SourceTags.id eq SourceTagMappings.sourceTagId))
            .select(SourceTags.code, SourceTags.name, SourceTags.otherName, SourceTags.type, SourceTags.site)
            .where { SourceTagMappings.targetMetaType eq metaType and (SourceTagMappings.targetMetaId eq metaId) }
            .map { MappingSourceTagDto(it[SourceTags.site]!!, it[SourceTags.type]!!, it[SourceTags.code]!!, it[SourceTags.name], it[SourceTags.otherName]) }
    }

    /**
     * 更新某个source tag的mapping。
     * @throws ResourceNotExist ("site", string) 给出的site不存在
     * @throws ResourceNotExist ("authors" | "topics" | "tags", number[]) 给出的meta tag不存在
     */
    fun update(sourceSite: String, tagType: String, tagCode: String, mappings: List<SourceMappingTargetItem>) {
        if(tagType.isBlank()) throw be(ParamRequired("tagType"))
        if(tagCode.isBlank()) throw be(ParamRequired("tagCode"))
        sourceTagManager.checkSourceSite(sourceSite)

        //查出source tag
        val sourceTag = sourceTagManager.getOrCreateSourceTag(sourceSite, tagType, tagCode)

        //首先查出所有已存在的mapping
        val old = data.db.sequenceOf(SourceTagMappings)
            .filter { it.sourceSite eq sourceSite and (it.sourceTagId eq sourceTag.id) }
            .asKotlinSequence()
            .associateBy({ SourceMappingTargetItem(it.targetMetaType, it.targetMetaId) }) { it.id }
        val current = mappings.toSet()
        //校验所有meta tag项都已存在
        val metaIds = mappings.groupBy { it.metaType }.mapValues { (_, values) -> values.map { it.metaId } }
        metaIds[MetaType.AUTHOR]?.validateMetaTagExist("authors", Authors) { it.id }
        metaIds[MetaType.TOPIC]?.validateMetaTagExist("topics", Topics) { it.id }
        metaIds[MetaType.TAG]?.validateMetaTagExist("tags", Tags) { it.id }

        //筛选出add项，增加这些项
        val added = current - old.keys
        if(added.isNotEmpty()) data.db.batchInsert(SourceTagMappings) {
            for (item in added) {
                item {
                    set(it.sourceSite, sourceSite)
                    set(it.sourceTagId, sourceTag.id)
                    set(it.targetMetaType, item.metaType)
                    set(it.targetMetaId, item.metaId)
                }
            }
        }

        //筛选出delete项，将这些项删除
        val deleted = (old.keys - current).map { old[it]!! }
        if(deleted.isNotEmpty()) data.db.delete(SourceTagMappings) { it.id inList deleted }

        if(added.isNotEmpty() || deleted.isNotEmpty()) {
            bus.emit(SourceTagMappingUpdated(sourceSite, tagType, tagCode))
        }
    }

    /**
     * 更新某个meta tag的source mapping。
     * @throws NotFound 请求对象不存在
     * @throws ResourceNotExist ("site", string) 给出的site不存在
     * @throws ResourceNotExist ("sourceTagType", string[]) 列出的tagType不存在
     */
    fun update(metaType: MetaType, metaId: Int, mappings: List<MappingSourceTagForm>): Boolean {
        //查询meta tag确定存在
        if(!when (metaType) {
            MetaType.TAG -> data.db.sequenceOf(Tags).any { it.id eq metaId }
            MetaType.TOPIC -> data.db.sequenceOf(Topics).any { it.id eq metaId }
            MetaType.AUTHOR -> data.db.sequenceOf(Authors).any { it.id eq metaId }
        }) throw be(NotFound())

        //处理所有给出项的更新，并获得这些source tag的id
        val mappingGroups = mappings.groupBy { it.site }
        mappingGroups.forEach { (site, _) -> sourceTagManager.checkSourceSite(site) }

        val current = mappingGroups.flatMap { (source, row) ->
            val sourceTags = row.map { SourceTagForm(it.code, it.type, it.name, it.otherName) }
            sourceTagManager.getAndUpsertSourceTags(source, sourceTags).map { source to it }
        }.toSet()

        //查询目前所有已存在的mapping source tag
        val old = data.db.sequenceOf(SourceTagMappings)
            .filter { it.targetMetaType eq metaType and (it.targetMetaId eq metaId) }
            .associateBy({ it.sourceSite to it.sourceTagId }) { it.id }

        //筛选出add项，增加这些项
        val added = current - old.keys
        if(added.isNotEmpty()) data.db.batchInsert(SourceTagMappings) {
            for ((sourceSite, sourceTagId) in added) {
                item {
                    set(it.sourceSite, sourceSite)
                    set(it.sourceTagId, sourceTagId)
                    set(it.targetMetaType, metaType)
                    set(it.targetMetaId, metaId)
                }
            }
        }

        //筛选出delete项，将这些项删除
        val deleted = old.keys - current
        if(deleted.isNotEmpty()) data.db.delete(SourceTagMappings) { it.id inList deleted.map { i -> old[i]!! } }

        return if(added.isNotEmpty() || deleted.isNotEmpty()) {
            val effectedSourceTagIds = added.map { (_, sourceTagId) -> sourceTagId } + deleted.map { (_, sourceTagId) -> sourceTagId }
            val effectedSourceTags = data.db.sequenceOf(SourceTags).filter { it.id inList effectedSourceTagIds }
            for (effectedSourceTag in effectedSourceTags) {
                bus.emit(SourceTagMappingUpdated(effectedSourceTag.site, effectedSourceTag.type, effectedSourceTag.code))
            }
            true
        }else{
            false
        }
    }

    private inline fun <T : Any> List<Int>?.validateMetaTagExist(propName: String, dto: MetaTagTable<T>, getId: (MetaTagTable<T>) -> Column<Int>) {
        if(this != null) {
            val idCol = getId(dto)
            val existIds = data.db.from(dto).select(idCol).where { idCol inList this }.map { it[idCol]!! }
            val lack = this.toSet() - existIds.toSet()
            if(lack.isNotEmpty()) throw be(ResourceNotExist(propName, lack))
        }
    }

    private fun mapTargetItemToDetail(items: List<SourceMappingTargetItem>): Map<SourceMappingTargetItem, SourceMappingTargetItemDetail> {
        val authorColors = appdata.setting.meta.authorColors
        val topicColors = appdata.setting.meta.topicColors

        val metas = items.groupBy { it.metaType }.mapValues { (_, value) -> value.map { it.metaId } }
        val authors = metas[MetaType.AUTHOR]?.let { authorIds ->
            data.db.from(Authors).select(Authors.id, Authors.name, Authors.type)
                .where { Authors.id inList authorIds }
                .toAuthorSimpleList(authorColors, isExported = ExportType.NO)
        }?.associate { SourceMappingTargetItem(MetaType.AUTHOR, it.id) to SourceMappingTargetItemDetail(MetaType.AUTHOR, it) } ?: emptyMap()
        val topics = metas[MetaType.TOPIC]?.let { topicIds ->
            data.db.from(Topics).select(Topics.id, Topics.name, Topics.type)
                .where { Topics.id inList topicIds }
                .toTopicSimpleList(topicColors, isExported = ExportType.NO, removeOverrideItem = false)
        }?.associate { SourceMappingTargetItem(MetaType.TOPIC, it.id) to SourceMappingTargetItemDetail(MetaType.TOPIC, it) } ?: emptyMap()
        val tags = metas[MetaType.TAG]?.let { tagIds ->
            data.db.from(Tags).select(Tags.id, Tags.name, Tags.color)
                .where { (Tags.id inList tagIds) and (Tags.type eq TagAddressType.TAG) }
                .toTagSimpleList(isExported = ExportType.NO, removeOverrideItem = false)
        }?.associate { SourceMappingTargetItem(MetaType.TAG, it.id) to SourceMappingTargetItemDetail(MetaType.TAG, it) } ?: emptyMap()

        return authors + topics + tags
    }
}