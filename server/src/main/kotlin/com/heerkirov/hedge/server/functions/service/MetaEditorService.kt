package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.form.MetaUtilIdentityForm
import com.heerkirov.hedge.server.dto.form.MetaUtilMetaForm
import com.heerkirov.hedge.server.dto.form.MetaUtilValidateForm
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.*
import com.heerkirov.hedge.server.exceptions.ConflictingGroupMembersError
import com.heerkirov.hedge.server.exceptions.NotFound
import com.heerkirov.hedge.server.exceptions.ResourceNotExist
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.functions.kit.MetaUtilKit
import com.heerkirov.hedge.server.functions.manager.HistoryRecordManager
import com.heerkirov.hedge.server.functions.manager.MetaManager
import com.heerkirov.hedge.server.model.HistoryRecord
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import org.ktorm.dsl.*
import org.ktorm.entity.*
import java.util.*

class MetaEditorService(private val appdata: AppDataManager,
                        private val data: DataRepository,
                        private val kit: MetaUtilKit,
                        private val metaManager: MetaManager,
                        private val historyRecordManager: HistoryRecordManager) {
    private val limitMetaTagCount = 20
    private val identityMaxStorageCount = 10
    private val identityHistory: LinkedList<MetaUtilIdentity> = LinkedList()

    /**
     * 对metaTag做内容校验和推导。它实际上是metaTag保存流程的一部分。
     * 这个API用于metaTag编辑器，实时对metaTag列表做验证，获得全局的推导结果，并提前得知错误关系。
     * @throws ResourceNotExist ("tags" | "topics" | "authors", number[]) 相应的元数据资源不存在。给出不存在的meta id列表
     */
    fun validate(form: MetaUtilValidateForm): MetaUtilValidateRes {
        val notSuitable: List<TagSimpleRes>
        val conflictingMembers: List<ConflictingGroupMembersError.ConflictingMembers>
        val exportedTags = if(!form.tags.isNullOrEmpty()) {
            val tags = data.db.sequenceOf(Tags).filter { it.id inList form.tags }.toList()
            if(tags.size < form.tags.size) {
                throw be(ResourceNotExist("tags", form.tags.toSet() - tags.asSequence().map { it.id }.toSet()))
            }
            //只允许设定类型为TAG的标签，不允许地址段。
            notSuitable = tags.filter { it.type != TagAddressType.TAG }.map { TagSimpleRes(it.id, it.name, it.color, ExportType.NO) }
            //导出，检查冲突组限制，提出警告和错误
            val (exported, tagExportError) = metaManager.exportTagModel(tags)
            conflictingMembers = tagExportError?.info ?: emptyList()
            exported.filter { (t, _) -> t.type == TagAddressType.TAG }
        }else{
            notSuitable = emptyList()
            conflictingMembers = emptyList()
            emptyList()
        }

        val exportedTopics = if(!form.topics.isNullOrEmpty()) {
            val topics = data.db.sequenceOf(Topics).filter { it.id inList form.topics }.toList()
            if(topics.size < form.topics.size) {
                throw be(ResourceNotExist("topics", form.topics.toSet() - topics.asSequence().map { it.id }.toSet()))
            }
            //导出
            metaManager.exportTopicModel(topics)
        }else{
            emptyList()
        }

        val exportedAuthors = if(!form.authors.isNullOrEmpty()) {
            val authors = data.db.sequenceOf(Authors).filter { it.id inList form.authors }.toList()
            if(authors.size < form.authors.size) {
                throw be(ResourceNotExist("authors", form.authors.toSet() - authors.toSet()))
            }
            //导出 (虽然是假的导出)
            metaManager.exportAuthorModel(authors)
        }else{
            emptyList()
        }

        val topicColors = appdata.setting.meta.topicColors
        val authorColors = appdata.setting.meta.authorColors

        return MetaUtilValidateRes(
            exportedTopics.asSequence()
                .sortedWith { (a, _), (b, _) -> a.type.compareTo(b.type).let { if(it == 0) a.id.compareTo(b.id) else it } }
                .map { (topic, isExported) -> TopicSimpleRes(topic.id, topic.name, topic.type, isExported, topicColors[topic.type]) }
                .toList(),
            exportedAuthors.asSequence()
                .sortedWith { (a, _), (b, _) -> a.type.compareTo(b.type).let { if(it == 0) a.id.compareTo(b.id) else it } }
                .map { (author, isExported) -> AuthorSimpleRes(author.id, author.name, author.type, isExported, authorColors[author.type]) }
                .toList(),
            exportedTags.asSequence()
                .sortedBy { (t, _) -> t.globalOrdinal }
                .map { (tag, isExported) -> TagSimpleRes(tag.id, tag.name, tag.color, isExported) }
                .toList(),
            notSuitable,
            conflictingMembers)
    }

    /**
     * 根据给出的元素和关联方式，推导出建议使用的元数据列表。
     * @throws ResourceNotExist ("imageId" | "collectionId" | "bookId", number)
     */
    fun suggest(form: MetaUtilIdentityForm): List<MetaUtilSuggestionRes> {
        return when (form.type) {
            IdentityType.IMAGE -> {
                //对于image，获得：parent的元数据; associate的元数据; 每一个已加入的book的元数据
                val row = data.db.from(Illusts).select(Illusts.parentId)
                    .where { (Illusts.id eq form.id) and (Illusts.type notEq IllustModelType.COLLECTION) }
                    .limit(1)
                    .firstOrNull() ?: throw be(ResourceNotExist("imageId", form.id))
                val parentId = row[Illusts.parentId]

                val ret = mutableListOf<MetaUtilSuggestionRes>()
                if(parentId != null) ret.add(kit.suggestMetaOfCollection(parentId))
                ret.addAll(kit.suggestMetaOfBook(form.id))
                kit.suggestMetaOfAllAssociate(form.id).also {
                    if(it.tags.isNotEmpty() || it.topics.isNotEmpty() || it.authors.isNotEmpty()) {
                        ret.add(it)
                    }
                }
                ret
            }
            IdentityType.COLLECTION -> {
                //对于collection，获得：所有children的元数据; associate的元数据
                data.db.sequenceOf(Illusts)
                    .firstOrNull { (Illusts.id eq form.id) and (Illusts.type eq IllustModelType.COLLECTION) }
                    ?: throw be(ResourceNotExist("collectionId", form.id))

                val ret = mutableListOf<MetaUtilSuggestionRes>()
                ret.add(kit.suggestMetaOfCollectionChildren(form.id))
                kit.suggestMetaOfAllAssociate(form.id).also {
                    if(it.tags.isNotEmpty() || it.topics.isNotEmpty() || it.authors.isNotEmpty()) {
                        ret.add(it)
                    }
                }
                ret
            }
            IdentityType.BOOK -> {
                //对于book，获得：所有item的元数据
                listOf(kit.suggestMetaOfBookChildren(form.id))
            }
        }
    }

    /**
     * 查看编辑过的对象的历史列表。
     */
    fun getHistoryIdentityList(): List<MetaUtilIdentity> {
        return identityHistory
    }

    /**
     * 获得某一项历史对象的metaTag详情。
     * @throws NotFound 无法找到目标对象。
     */
    fun getHistoryIdentityDetail(type: IdentityType, id: Int): MetaUtilRes {
        return when (type) {
            IdentityType.IMAGE -> {
                if(!data.db.sequenceOf(Illusts).filter { (it.id eq id) and (it.type notEq IllustModelType.COLLECTION) }.any()) throw be(NotFound())
                kit.getMetaOfIllust(id)
            }
            IdentityType.COLLECTION -> {
                if(!data.db.sequenceOf(Illusts).filter { (it.id eq id) and (it.type eq IllustModelType.COLLECTION) }.any()) throw be(NotFound())
                kit.getMetaOfIllust(id)
            }
            else -> {
                if(!data.db.sequenceOf(Books).filter { it.id eq id }.any()) throw be(NotFound())
                kit.getMetaOfBook(id)
            }
        }
    }

    /**
     * 添加对象到历史。
     */
    fun pushHistoryIdentity(form: MetaUtilIdentityForm) {
        val model = MetaUtilIdentity(form.type, form.id)
        //首先尝试移除可能已存在的model，防止重复
        identityHistory.remove(model)
        //然后再次添加到队首
        identityHistory.addFirst(model)
        if(identityHistory.size > identityMaxStorageCount) {
            identityHistory.removeLast()
        }
    }

    /**
     * 查看最近使用过的metaTag的列表。
     */
    fun getHistoryMetaRecent(): MetaUtilRes {
        val metas = MetaType.entries.associateWith { historyRecordManager.getHistory(HistoryRecord.HistoryType.META_EDITOR, it.name, limitMetaTagCount).map(String::toInt) }
        return mapMetasToEntities(metas)
    }

    /**
     * 添加一组metaTag到历史。
     */
    fun pushHistoryMeta(form: MetaUtilMetaForm) {
        data.db.transaction {
            form.metas.forEach { (type, id) -> historyRecordManager.push(HistoryRecord.HistoryType.META_EDITOR, type.toString(), id.toString()) }
        }
    }

    /**
     * 清空所有metaTag历史记录。
     */
    fun deleteAllHistoryMeta() {
        historyRecordManager.clear(HistoryRecord.HistoryType.META_EDITOR)
    }

    /**
     * 将manager返回的meta与id的综合列表保持顺序映射成实体。
     */
    private fun mapMetasToEntities(metas: Map<MetaType, List<Int>>): MetaUtilRes {
        val topics = metas[MetaType.TOPIC].let { topicIds ->
            if(topicIds.isNullOrEmpty()) emptyList() else {
                val topicColors = appdata.setting.meta.topicColors
                val result = data.db.from(Topics)
                    .select(Topics.id, Topics.name, Topics.type)
                    .where { Topics.id inList topicIds }
                    .toTopicSimpleList(topicColors, isExported = ExportType.NO, removeOverrideItem = false)
                    .associateBy { it.id }
                topicIds.mapNotNull(result::get)
            }
        }

        val authors = metas[MetaType.AUTHOR].let { authorIds ->
            if(authorIds.isNullOrEmpty()) emptyList() else {
                val authorColors = appdata.setting.meta.authorColors
                val result = data.db.from(Authors)
                    .select(Authors.id, Authors.name, Authors.type)
                    .where { Authors.id inList authorIds }
                    .toAuthorSimpleList(authorColors, isExported = ExportType.NO)
                    .associateBy { it.id }
                authorIds.mapNotNull(result::get)
            }
        }

        val tags = metas[MetaType.TAG].let { tagIds ->
            if(tagIds.isNullOrEmpty()) emptyList() else {
                val result = data.db.from(Tags)
                    .select(Tags.id, Tags.name, Tags.color)
                    .where { Tags.id inList tagIds }
                    .toTagSimpleList(isExported = ExportType.NO, removeOverrideItem = false)
                    .associateBy { it.id }
                tagIds.mapNotNull(result::get)
            }
        }

        return MetaUtilRes(topics, authors, tags)
    }
}