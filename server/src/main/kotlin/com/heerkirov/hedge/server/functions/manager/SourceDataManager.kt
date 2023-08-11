package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.appdata.SourceOption
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.form.SourceBookForm
import com.heerkirov.hedge.server.dto.form.SourceTagForm
import com.heerkirov.hedge.server.enums.SourceEditStatus
import com.heerkirov.hedge.server.events.SourceDataCreated
import com.heerkirov.hedge.server.events.SourceDataDeleted
import com.heerkirov.hedge.server.events.SourceDataUpdated
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.model.SourceData
import com.heerkirov.hedge.server.utils.DateTime
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import com.heerkirov.hedge.server.utils.types.Opt
import com.heerkirov.hedge.server.utils.types.anyOpt
import com.heerkirov.hedge.server.utils.types.optOf
import com.heerkirov.hedge.server.utils.types.undefined
import org.ktorm.dsl.*
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf

class SourceDataManager(private val appdata: AppDataManager,
                        private val data: DataRepository,
                        private val bus: EventBus,
                        private val sourceTagManager: SourceTagManager,
                        private val sourceBookManager: SourceBookManager) {
    /**
     * 检查source key。主要检查source是否是已注册的site，检查part是否存在，检查id/part是否为非负数。
     * @return 如果给出的值是null，那么返回null，否则，返回一个tuple，用于后续工具链处理。
     * @throws ResourceNotExist ("site", string) 给出的source不存在
     */
    fun checkSourceSite(sourceSite: String?, sourceId: Long?, sourcePart: Int?, sourcePartName: String?): Pair<String, Long>? {
        return if(sourceSite != null) {
            val site = appdata.setting.source.sites.firstOrNull { it.name == sourceSite } ?: throw be(ResourceNotExist("site", sourceSite))

            if(sourceId == null) throw be(ParamRequired("sourceId"))
            else if(sourceId < 0) throw be(ParamError("sourceId"))

            when (site.partMode) {
                SourceOption.SitePartMode.NO -> {
                    if(sourcePart != null) throw be(ParamNotRequired("sourcePart"))
                    if(sourcePartName != null) throw be(ParamNotRequired("sourcePartName"))
                }
                SourceOption.SitePartMode.PAGE -> {
                    if(sourcePart == null) throw be(ParamRequired("sourcePart"))
                    else if(sourcePart < 0) throw be(ParamError("sourcePart"))
                    if(sourcePartName != null) throw be(ParamNotRequired("sourcePartName"))
                }
                SourceOption.SitePartMode.PAGE_WITH_NAME -> {
                    if(sourcePart == null) throw be(ParamRequired("sourcePart"))
                    else if(sourcePart < 0) throw be(ParamError("sourcePart"))
                }
            }

            Pair(sourceSite, sourceId)
        }else{
            null
        }
    }

    /**
     * 检查source key。主要检查source是否是已注册的site，检查id/part是否为非负数。
     * @return 如果给出的值是null，那么返回null，否则，返回一个pair，用于后续工具链处理。
     * @throws ResourceNotExist ("site", string) 给出的source不存在
     */
    fun checkSourceSite(sourceSite: String?, sourceId: Long?): Pair<String, Long>? {
        return if(sourceSite != null) {
            appdata.setting.source.sites.firstOrNull { it.name == sourceSite } ?: throw be(ResourceNotExist("site", sourceSite))

            if(sourceId == null) throw be(ParamRequired("sourceId"))
            else if(sourceId < 0) throw be(ParamError("sourceId"))

            Pair(sourceSite, sourceId)
        }else{
            null
        }
    }

    /**
     * 检查source key是否存在。如果存在，检查目标sourceImage是否存在并创建对应的记录。在创建之前自动检查source key。
     * @return rowId 返回在sourceImage中实际存储的key。
     * @throws ResourceNotExist ("source", string) 给出的source不存在
     */
    fun validateAndCreateSourceDataIfNotExist(sourceSite: String, sourceId: Long): Int {
        val sourceData = data.db.sequenceOf(SourceDatas).firstOrNull { (it.sourceSite eq sourceSite) and (it.sourceId eq sourceId) }
        return if(sourceData != null) {
            sourceData.id
        }else{
            val now = DateTime.now()
            val id = data.db.insertAndGenerateKey(SourceDatas) {
                set(it.sourceSite, sourceSite)
                set(it.sourceId, sourceId)
                set(it.title, null)
                set(it.description, null)
                set(it.relations, null)
                set(it.links, null)
                set(it.additionalInfo, null)
                set(it.empty, true)
                set(it.status, SourceEditStatus.NOT_EDITED)
                set(it.cachedCount, SourceData.SourceCount(0, 0, 0))
                set(it.createTime, now)
                set(it.updateTime, now)
            } as Int

            bus.emit(SourceDataCreated(sourceSite, sourceId, id))

            id
        }
    }

    /**
     * 检查additionalInfo的字段是否合法。
     * @throws ParamError 如果存在不合法的字段，抛出此异常。
     */
    private fun validateAdditionalInfo(sourceSite: String, additionalInfo: Map<String, String>) {
        val site = appdata.setting.source.sites.first { it.name == sourceSite }
        val availableFields = site.availableAdditionalInfo.asSequence().map { it.field }.toSet()
        for (field in additionalInfo.keys) {
            if(field !in availableFields) throw be(ParamError("additionalInfo"))
        }
    }

    /**
     * 尝试根据site的规则，自动生成新的links，与表单的links一起返回。
     */
    private fun generateLinks(sourceSite: String, sourceId: Long, newInfo: Map<String, String>, newLinks: Opt<List<String>>, oldInfo: Map<String, String>?, oldLinks: List<String>?): Opt<List<String>> {
        val rules = appdata.setting.source.sites.first { it.name == sourceSite }.sourceLinkGenerateRules
        if(rules.isEmpty()) {
            return newLinks
        }

        fun generateLinkByParams(sourceId: String, additionalInfo: Map<String, String>): List<String> {
            val generatedLinks = ArrayList<String>()
            for (rule in rules) {
                //对每一条rule做替换尝试。任何一个$variable都会被尝试替换。当一条rule中的所有$都能被替换掉时，此rule可用。
                var s = rule.trim()
                s = s.replace("${'$'}id", sourceId, ignoreCase = true)
                for ((k, v) in additionalInfo) {
                    s = s.replace("${'$'}$k", v, ignoreCase = true)
                }
                if(s.indexOf('$') < 0) {
                    generatedLinks.add(s)
                }
            }
            return generatedLinks
        }

        //根据新info生成links
        val newGeneratedLinks = generateLinkByParams(sourceId.toString(), newInfo)
        //根据旧info生成links
        val oldGeneratedLinks = if(!oldInfo.isNullOrEmpty()) generateLinkByParams(sourceId.toString(), oldInfo).toSet() else emptySet()
        //需要从links中移除oldGeneratedLinks，再包含newGeneratedLinks
        val plus = newGeneratedLinks - oldGeneratedLinks
        val minus = oldGeneratedLinks - newGeneratedLinks.toSet()

        return if(newLinks.isPresent) {
            if(plus.isEmpty() && minus.isEmpty()) {
                newLinks
            }else{
                optOf(newLinks.value - minus + plus)
            }
        }else if(!oldLinks.isNullOrEmpty()) {
            if(plus.isEmpty() && minus.isEmpty()) {
                undefined()
            }else{
                optOf(oldLinks - minus + plus)
            }
        }else{
            //如果oldLinks不存在，则根据生成内容直接返回
            if(newGeneratedLinks.isEmpty()) undefined() else optOf(newGeneratedLinks)
        }
    }

    /**
     * 检查source key是否存在，创建对应记录，并手动更新内容。不会检查sourceSite合法性，因为假设之前已经校验过了。
     * @return (rowId, sourceSite, sourceId) 返回在sourceImage中实际存储的key。
     * @throws ResourceNotExist ("source", string) 给出的source不存在
     * @throws ParamError additionalInfo字段不合法
     * @throws NotFound 请求对象不存在 (allowCreate=false时抛出)
     * @throws AlreadyExists 此对象已存在 (allowUpdate=false时抛出)
     */
    fun createOrUpdateSourceData(sourceSite: String, sourceId: Long,
                                 status: Opt<SourceEditStatus>,
                                 title: Opt<String?>,
                                 description: Opt<String?>,
                                 tags: Opt<List<SourceTagForm>>,
                                 books: Opt<List<SourceBookForm>>,
                                 relations: Opt<List<Long>>,
                                 links: Opt<List<String>>,
                                 additionalInfo: Opt<Map<String, String>>,
                                 allowCreate: Boolean = true,
                                 allowUpdate: Boolean = true,
                                 appendUpdate: Boolean = false): Triple<Int?, String?, Long?> {
        val sourceData = data.db.sequenceOf(SourceDatas).firstOrNull { (it.sourceSite eq sourceSite) and (it.sourceId eq sourceId) }
        if(sourceData == null) {
            if(!allowCreate) throw be(NotFound())

            additionalInfo.alsoOpt { validateAdditionalInfo(sourceSite, it) }

            //新建
            val finalLinks = generateLinks(sourceSite, sourceId, additionalInfo.unwrapOr { emptyMap() }, links, null, null)
            val sourceCount = SourceData.SourceCount(
                tags.letOpt { it.size }.unwrapOr { 0 },
                books.letOpt { it.size }.unwrapOr { 0 },
                relations.letOpt { it.size }.unwrapOr { 0 }
            )
            val empty = title.letOpt { it.isNullOrEmpty() }.unwrapOr { true }
                    && description.letOpt { it.isNullOrEmpty() }.unwrapOr { true }
                    && tags.letOpt { it.isEmpty() }.unwrapOr { true }
                    && books.letOpt { it.isEmpty() }.unwrapOr { true }
                    && relations.letOpt { it.isEmpty() }.unwrapOr { true }
            val finalStatus = status.unwrapOr { if(empty) SourceEditStatus.NOT_EDITED else SourceEditStatus.EDITED }

            val now = DateTime.now()
            val id = data.db.insertAndGenerateKey(SourceDatas) {
                set(it.sourceSite, sourceSite)
                set(it.sourceId, sourceId)
                set(it.title, title.unwrapOrNull())
                set(it.description, description.unwrapOrNull())
                set(it.relations, relations.unwrapOrNull())
                set(it.links, finalLinks.unwrapOrNull())
                set(it.additionalInfo, additionalInfo.unwrapOrNull())
                set(it.cachedCount, sourceCount)
                set(it.empty, empty)
                set(it.status, finalStatus)
                set(it.createTime, now)
                set(it.updateTime, now)
            } as Int

            tags.applyOpt {
                if(isNotEmpty()) {
                    val tagIds = sourceTagManager.getAndUpsertSourceTags(sourceSite, this)
                    if(tagIds.isNotEmpty()) data.db.batchInsert(SourceTagRelations) {
                        for (tagId in tagIds) {
                            item {
                                set(it.sourceDataId, id)
                                set(it.sourceTagId, tagId)
                            }
                        }
                    }
                }
            }

            books.applyOpt {
                if(isNotEmpty()) {
                    val bookIds = sourceBookManager.getAndUpsertSourceBooks(sourceSite, this)
                    if(bookIds.isNotEmpty()) data.db.batchInsert(SourceBookRelations) {
                        for (bookId in bookIds) {
                            item {
                                set(it.sourceDataId, id)
                                set(it.sourceBookId, bookId)
                            }
                        }
                    }
                }
            }

            bus.emit(SourceDataCreated(sourceSite, sourceId, id))

            return Triple(id, sourceSite, sourceId)
        }else if(!appendUpdate) {
            if(!allowUpdate) throw be(AlreadyExists("SourceData", "sourceId", sourceId))

            additionalInfo.alsoOpt { validateAdditionalInfo(sourceSite, it) }

            //只有在additionalInfo变动时，才会使用它重新生成links
            val finalLinks = if(additionalInfo.isPresent) generateLinks(sourceSite, sourceId, additionalInfo.value, links, sourceData.additionalInfo, sourceData.links) else links

            val cachedCount = if(anyOpt(tags, books, relations)) {
                Opt(SourceData.SourceCount(
                    tags.letOpt { it.size }.unwrapOr { sourceData.cachedCount.tagCount },
                    books.letOpt { it.size }.unwrapOr { sourceData.cachedCount.bookCount },
                    relations.letOpt { it.size }.unwrapOr { sourceData.cachedCount.relationCount }
                ))
            }else undefined()

            val empty = title.unwrapOr { sourceData.title }.isNullOrEmpty()
                    && description.unwrapOr { sourceData.description }.isNullOrEmpty()
                    && cachedCount.unwrapOr { sourceData.cachedCount }.let { it.relationCount <= 0 && it.bookCount <= 0 && it.tagCount <= 0 }

            val finalStatus = if(status.isPresent) status else if(anyOpt(title, description, tags, books, relations)) optOf(SourceEditStatus.EDITED) else undefined()

            if(title.isPresent || description.isPresent || relations.isPresent || cachedCount.isPresent || finalLinks.isPresent || additionalInfo.isPresent || finalStatus.isPresent) {
                data.db.update(SourceDatas) {
                    where { it.id eq sourceData.id }
                    title.applyOpt { set(it.title, this) }
                    description.applyOpt { set(it.description, this) }
                    relations.applyOpt { set(it.relations, this) }
                    finalLinks.applyOpt { set(it.links, this) }
                    additionalInfo.applyOpt { set(it.additionalInfo, this) }
                    cachedCount.applyOpt { set(it.cachedCount, this) }
                    finalStatus.applyOpt { set(it.status, this) }
                    set(it.empty, empty)
                    set(it.updateTime, DateTime.now())
                }
            }

            tags.applyOpt {
                data.db.delete(SourceTagRelations) { it.sourceDataId eq sourceData.id }
                if(isNotEmpty()) {
                    val tagIds = sourceTagManager.getAndUpsertSourceTags(sourceSite, this)
                    data.db.batchInsert(SourceTagRelations) {
                        for (tagId in tagIds) {
                            item {
                                set(it.sourceDataId, sourceData.id)
                                set(it.sourceTagId, tagId)
                            }
                        }
                    }
                }
            }

            books.applyOpt {
                data.db.delete(SourceBookRelations) { it.sourceDataId eq sourceData.id }
                if(isNotEmpty()) {
                    val bookIds = sourceBookManager.getAndUpsertSourceBooks(sourceSite, this)
                    data.db.batchInsert(SourceBookRelations) {
                        for (bookId in bookIds) {
                            item {
                                set(it.sourceDataId, sourceData.id)
                                set(it.sourceBookId, bookId)
                            }
                        }
                    }
                }
            }

            bus.emit(SourceDataUpdated(sourceSite, sourceId, sourceData.id))

            return Triple(sourceData.id, sourceSite, sourceId)
        }else{
            //append模式下，tags、books、relations、additionalInfo将以追加模式编辑，不会完全清空旧值。
            if(!allowUpdate) throw be(AlreadyExists("SourceData", "sourceId", sourceId))

            val fixedAdditionalInfo = additionalInfo.letOpt {
                validateAdditionalInfo(sourceSite, it)
                if(sourceData.additionalInfo.isNullOrEmpty()) it else sourceData.additionalInfo + it
            }

            val fixedRelations = relations.letOpt {
                if(sourceData.relations.isNullOrEmpty()) it else (sourceData.relations + it).distinct()
            }

            //只有在additionalInfo变动时，才会使用它重新生成links
            val finalLinks = if(fixedAdditionalInfo.isPresent) generateLinks(sourceSite, sourceId, fixedAdditionalInfo.value, links, sourceData.additionalInfo, sourceData.links) else links

            var appendTags: Opt<List<Int>> = undefined()
            tags.applyOpt {
                data.db.delete(SourceTagRelations) { it.sourceDataId eq sourceData.id }
                if(isNotEmpty()) {
                    val tagIds = sourceTagManager.getAndUpsertSourceTags(sourceSite, this)
                    val existTagIds = data.db.from(SourceTagRelations)
                        .select(SourceTagRelations.sourceTagId)
                        .where { SourceTagRelations.sourceDataId eq sourceData.id and (SourceTagRelations.sourceTagId inList tagIds) }
                        .map { it[SourceTagRelations.sourceTagId]!! }
                    val appendTagIds = existTagIds - tagIds.toSet()
                    if(appendTagIds.isNotEmpty()) {
                        data.db.batchInsert(SourceTagRelations) {
                            for (tagId in appendTagIds) {
                                item {
                                    set(it.sourceDataId, sourceData.id)
                                    set(it.sourceTagId, tagId)
                                }
                            }
                        }
                        appendTags = optOf(appendTagIds)
                    }
                }
            }

            var appendBooks: Opt<List<Int>> = undefined()
            books.applyOpt {
                data.db.delete(SourceBookRelations) { it.sourceDataId eq sourceData.id }
                if(isNotEmpty()) {
                    val bookIds = sourceBookManager.getAndUpsertSourceBooks(sourceSite, this)
                    val existBookIds = data.db.from(SourceBookRelations)
                        .select(SourceBookRelations.sourceBookId)
                        .where { SourceBookRelations.sourceDataId eq sourceData.id and (SourceBookRelations.sourceBookId inList bookIds) }
                        .map { it[SourceBookRelations.sourceBookId]!! }
                    val appendBookIds = existBookIds - bookIds.toSet()
                    if(appendBookIds.isNotEmpty()) {
                        data.db.batchInsert(SourceBookRelations) {
                            for (bookId in appendBookIds) {
                                item {
                                    set(it.sourceDataId, sourceData.id)
                                    set(it.sourceBookId, bookId)
                                }
                            }
                        }
                        appendBooks = optOf(appendBookIds)
                    }
                }
            }

            val cachedCount = if(anyOpt(appendTags, appendBooks, fixedRelations)) {
                Opt(SourceData.SourceCount(
                    appendTags.letOpt { it.size + sourceData.cachedCount.tagCount }.unwrapOr { sourceData.cachedCount.tagCount },
                    appendBooks.letOpt { it.size + sourceData.cachedCount.bookCount }.unwrapOr { sourceData.cachedCount.bookCount },
                    fixedRelations.letOpt { it.size }.unwrapOr { sourceData.cachedCount.relationCount }
                ))
            }else undefined()

            val empty = title.unwrapOr { sourceData.title }.isNullOrEmpty()
                    && description.unwrapOr { sourceData.description }.isNullOrEmpty()
                    && cachedCount.unwrapOr { sourceData.cachedCount }.let { it.relationCount <= 0 && it.bookCount <= 0 && it.tagCount <= 0 }

            val finalStatus = if(status.isPresent) status else if(anyOpt(title, description, appendTags, appendBooks, fixedRelations)) optOf(SourceEditStatus.EDITED) else undefined()

            if(title.isPresent || description.isPresent || fixedRelations.isPresent || cachedCount.isPresent || finalLinks.isPresent || fixedAdditionalInfo.isPresent || finalStatus.isPresent) {
                data.db.update(SourceDatas) {
                    where { it.id eq sourceData.id }
                    title.applyOpt { set(it.title, this) }
                    description.applyOpt { set(it.description, this) }
                    fixedRelations.applyOpt { set(it.relations, this) }
                    finalLinks.applyOpt { set(it.links, this) }
                    fixedAdditionalInfo.applyOpt { set(it.additionalInfo, this) }
                    cachedCount.applyOpt { set(it.cachedCount, this) }
                    finalStatus.applyOpt { set(it.status, this) }
                    set(it.empty, empty)
                    set(it.updateTime, DateTime.now())
                }
            }

            bus.emit(SourceDataUpdated(sourceSite, sourceId, sourceData.id))

            return Triple(sourceData.id, sourceSite, sourceId)
        }
    }

    /**
     * 删除source data。清除在illust的缓存。
     * @throws NotFound 请求对象不存在。
     */
    fun deleteSourceData(sourceSite: String, sourceId: Long) {
        val row = data.db.from(SourceDatas).select()
            .where { (SourceDatas.sourceSite eq sourceSite) and (SourceDatas.sourceId eq sourceId) }
            .firstOrNull()
            ?: throw be(NotFound())

        val sourceDataId = row[SourceDatas.id]!!

        data.db.update(Illusts) {
            where { it.sourceDataId eq sourceDataId }
            set(it.sourceDataId, null)
            set(it.sourceSite, null)
            set(it.sourceId, null)
            set(it.sourcePart, null)
            set(it.sourcePartName, null)
        }

        data.db.delete(SourceDatas) { it.id eq sourceDataId }
        data.db.delete(SourceTagRelations) { it.sourceDataId eq sourceDataId }
        data.db.delete(SourceBookRelations) { it.sourceDataId eq sourceDataId }
        data.db.delete(SourceMarks) { it.sourceDataId eq sourceDataId }
        data.db.delete(SourceMarks) { it.relatedSourceDataId eq sourceDataId }

        bus.emit(SourceDataDeleted(sourceSite, sourceId))
    }
}