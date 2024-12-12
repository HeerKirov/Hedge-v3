package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.EntityMetaRelationTable
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.enums.TagAddressType
import com.heerkirov.hedge.server.enums.TagGroupType
import com.heerkirov.hedge.server.exceptions.ConflictingGroupMembersError
import com.heerkirov.hedge.server.exceptions.ResourceNotExist
import com.heerkirov.hedge.server.exceptions.ResourceNotSuitable
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.model.*
import com.heerkirov.hedge.server.utils.ktorm.asSequence
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import com.heerkirov.hedge.server.utils.runIf
import org.ktorm.dsl.*
import org.ktorm.entity.filter
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import org.ktorm.entity.toList
import java.time.Instant
import java.util.*
import kotlin.collections.HashMap
import kotlin.collections.HashSet

class MetaManager(private val data: DataRepository) {
    /**
     * 该方法使用在设置tag时，对tag进行校验并导出，返回声明式的tag列表。
     * @param ignoreError 忽略产生的错误，对于缺少/不适用的项，将其跳过。
     * @return 一组tag。Int表示tag id，Boolean表示此tag是否为导出tag。
     * @throws ResourceNotExist ("tags", number[]) 部分tags资源不存在。给出不存在的tag id列表
     * @throws ResourceNotSuitable ("tags", number[]) 部分tags资源不适用。地址段不适用于此项。给出不适用的tag id列表
     * @throws ConflictingGroupMembersError 发现标签冲突组。此方法会直接把冲突组问题作为异常抛出，而不是继续在参数里传递
     */
    fun validateAndExportTag(tagIds: List<Int>, ignoreError: Boolean = false): List<Pair<Int, Boolean>> {
        return validateAndExportTagModel(tagIds, ignoreError).map { (t, e) -> t.id to e }
    }

    /**
     * 该方法使用在设置tag时，对tag进行校验并导出，返回声明式的tag列表。
     * @param ignoreError 忽略产生的错误，对于缺少/不适用的项，将其跳过。
     * @return 一组tag。Boolean表示此tag是否为导出tag。
     * @throws ResourceNotExist ("tags", number[]) 部分tags资源不存在。给出不存在的tag id列表
     * @throws ResourceNotSuitable ("tags", number[]) 部分tags资源不适用。地址段不适用于此项。给出不适用的tag id列表
     * @throws ConflictingGroupMembersError 发现标签冲突组。此方法会直接把冲突组问题作为异常抛出，而不是继续在参数里传递
     */
    fun validateAndExportTagModel(tagIds: List<Int>, ignoreError: Boolean = false): List<Pair<Tag, Boolean>> {
        val set = tagIds.toSet()
        val tags = data.db.sequenceOf(Tags).filter { it.id inList set }.toList()
        if(!ignoreError && tags.size < set.size) {
            throw be(ResourceNotExist("tags", set - tags.asSequence().map { it.id }.toSet()))
        }
        if(!ignoreError) tags.filter { it.type != TagAddressType.TAG }.run {
            //只允许设定类型为TAG的标签，不允许地址段。
            if(isNotEmpty()) throw be(ResourceNotSuitable("tags", map { it.id }))
        }

        val (result, e) = exportTagModel(tags)
        if(!ignoreError && e != null) {
            //此方法只检出强制冲突组
            val forceInfo = e.info.filter { it.force }
            if(forceInfo.isNotEmpty()) {
                throw be(ConflictingGroupMembersError(forceInfo))
            }
        }
        return result
    }

    /**
     * 该方法使用在设置topic时，对topic进行校验并导出，返回声明式的topic列表。
     * @param ignoreError 忽略产生的错误，对于缺少/不适用的项，将其跳过。
     * @return 一组topic。Int表示topic id，Boolean表示此topic是否为导出tag。
     * @throws ResourceNotExist ("topics", number[]) 部分topics资源不存在。给出不存在的topic id列表
     */
    fun validateAndExportTopic(topicIds: List<Int>, ignoreError: Boolean = false): List<Pair<Int, Boolean>> {
        return validateAndExportTopicModel(topicIds, ignoreError).map { (t, e) -> t.id to e }
    }

    /**
     * 该方法使用在设置topic时，对topic进行校验并导出，返回声明式的topic列表。
     * @param ignoreError 忽略产生的错误，对于缺少/不适用的项，将其跳过。
     * @return 一组topic。Int表示topic id，Boolean表示此topic是否为导出tag。
     * @throws ResourceNotExist ("topics", number[]) 部分topics资源不存在。给出不存在的topic id列表
     */
    fun validateAndExportTopicModel(topicIds: List<Int>, ignoreError: Boolean = false): List<Pair<Topic, Boolean>> {
        val set = topicIds.toSet()
        val topics = data.db.sequenceOf(Topics).filter { it.id inList set }.toList()
        if(!ignoreError && topics.size < set.size) {
            throw be(ResourceNotExist("topics", set - topics.asSequence().map { it.id }.toSet()))
        }

        return exportTopicModel(topics)
    }

    /**
     * 该方法使用在设置author时，对author进行校验并导出，返回声明式的author列表。
     * @param ignoreError 忽略产生的错误，对于缺少/不适用的项，将其跳过。
     * @return 一组author。Int表示tag id，Boolean表示此tag是否为导出tag。
     * @throws ResourceNotExist ("authors", number[]) 部分authors资源不存在。给出不存在的author id列表
     */
    fun validateAndExportAuthor(authors: List<Int>, ignoreError: Boolean = false): List<Pair<Int, Boolean>> {
        return validateAndExportAuthorModel(authors, ignoreError).map { (t, e) -> t.id to e }
    }

    /**
     * 该方法使用在设置author时，对author进行校验并导出，返回声明式的author列表。
     * @param ignoreError 忽略产生的错误，对于缺少/不适用的项，将其跳过。
     * @return 一组author。Int表示tag id，Boolean表示此tag是否为导出tag。
     * @throws ResourceNotExist ("authors", number[]) 部分authors资源不存在。给出不存在的author id列表
     */
    fun validateAndExportAuthorModel(authors: List<Int>, ignoreError: Boolean = false): List<Pair<Author, Boolean>> {
        val set = authors.toSet()
        val result = data.db.from(Authors).select().where { Authors.id inList set }.map { Authors.createEntity(it) }
        if(!ignoreError && result.size < set.size) {
            throw be(ResourceNotExist("authors", set - result.map { it }.toSet()))
        }

        //author类型的标签没有导出机制，因此直接返回结果。
        return result.map { it to false }
    }

    /**
     * 对tag进行导出。结果是id。
     * @return 返回一个结果和检查错误的双元组。检查错误是不会打断结果输出的。
     */
    fun exportTag(tags: List<Tag>): Pair<List<Pair<Int, Boolean>>, ConflictingGroupMembersError?> {
        val (result, e) = exportTagModel(tags)
        return result.map { (tag, isExported) -> tag.id to isExported } to e
    }

    /**
     * 对topic进行导出。结果是id。
     */
    fun exportTopic(topics: List<Topic>): List<Pair<Int, Boolean>> {
        return exportTopicModel(topics).map { (topic, isExported) -> topic.id to isExported }
    }

    /**
     * 对author进行导出。结果是id。
     */
    fun exportAuthor(authors: List<Author>): List<Pair<Int, Boolean>> {
        return authors.map { it.id to false }
    }

    /**
     * 对tag进行导出。
     * @return 返回一个结果和检查错误的双元组。检查错误是不会打断结果输出的。
     */
    fun exportTagModel(tags: List<Tag>): Pair<List<Pair<Tag, Boolean>>, ConflictingGroupMembersError?> {
        //记下所有访问过的节点父子关系
        val childrenMap = HashMap<Int, MutableSet<Int>>().apply { for (tag in tags) if(tag.parentId != null) computeIfAbsent(tag.parentId) { mutableSetOf() }.apply { add(tag.id) } }
        //已经访问过的节点。原tags列表的节点直接进去了
        val been = HashMap<Int, Tag?>(tags.size * 2).apply { tags.forEach { put(it.id, it) } }
        //等待访问的队列。将原tags列表的parent和links直接加进去
        val queue = LinkedList<Int>().apply { addAll(tags.mapNotNull { it.parentId }) }.apply { addAll(tags.flatMap { it.links ?: emptyList() }) }
        //导出的项的结果
        val exportedTags = LinkedList<Tag>()

        while(queue.isNotEmpty()) {
            val nextId = queue.pop()
            if(nextId !in been) {
                val tag = data.db.sequenceOf(Tags).firstOrNull { it.id eq nextId }
                if(tag != null) {
                    //只有虚拟地址段不会导出到关系表，其他类型都会导出。
                    if(tag.type != TagAddressType.VIRTUAL_ADDR) exportedTags.add(tag)
                    if(tag.parentId != null) {
                        queue.add(tag.parentId)
                        childrenMap.computeIfAbsent(tag.parentId) { mutableSetOf() }.apply { add(nextId) }
                    }
                    if(tag.links != null) queue.addAll(tag.links)
                }
                been[nextId] = tag
            }
        }

        val result = (tags.asSequence().map { it to false } + exportedTags.asSequence().map { it to true }).toList()

        //冲突组检查
        val isExportedMap = result.associate { (tag, isExported) -> tag.id to isExported }
        //筛选出所有的强制冲突组
        val conflictingMembers = childrenMap.asSequence()
            .filter { (id, members) -> members.size > 1 && been[id]!!.isGroup != TagGroupType.NO }
            .map { (groupId, members) ->
                val groupTag = been[groupId]!!
                val groupMember = ConflictingGroupMembersError.Member(groupTag.id, groupTag.name, groupTag.color, isExportedMap.getOrDefault(groupId, true))
                val force = groupTag.isGroup == TagGroupType.FORCE || groupTag.isGroup == TagGroupType.FORCE_AND_SEQUENCE
                ConflictingGroupMembersError.ConflictingMembers(groupMember, force, members.map { ConflictingGroupMembersError.Member(it, been[it]!!.name, been[it]!!.color, isExportedMap.getOrDefault(it, true)) })
            }
            .toList()

        return result to if(conflictingMembers.isNotEmpty()) ConflictingGroupMembersError(conflictingMembers) else null
    }

    /**
     * 对topic进行导出。
     */
    fun exportTopicModel(topics: List<Topic>): List<Pair<Topic, Boolean>> {
        val been = HashSet<Int>(topics.size * 2).apply { addAll(topics.map { it.id }) }
        val queue = LinkedList<Int>().apply { addAll(topics.mapNotNull { it.parentId }) }
        val exportedTopics = LinkedList<Topic>()

        while(queue.isNotEmpty()) {
            val nextId = queue.pop()
            if(nextId !in been) {
                val topic = data.db.sequenceOf(Topics).firstOrNull { it.id eq nextId }
                if(topic != null) {
                    exportedTopics.add(topic)
                    if(topic.parentId != null) queue.add(topic.parentId)
                }
                been.add(nextId)
            }
        }

        return topics.map { it to false } + exportedTopics.map { it to true }
    }

    /**
     * 对author进行导出。
     */
    fun exportAuthorModel(authors: List<Author>): List<Pair<Author, Boolean>> {
        return authors.map { it to false }
    }

    /**
     * 检验并处理某一种类的meta tag。
     */
    fun <T, R> processMetaTags(thisId: Int, creating: Boolean = false, analyseStatisticCount: Boolean,
                               newTagIds: List<Pair<Int, Boolean>>,
                               metaTag: T, metaRelations: R)
    where T: MetaTagTable<*>, R: EntityMetaRelationTable<*> {
        val now = Instant.now()

        val tagIds = newTagIds.toMap()
        val oldTagIds = if(creating) emptyMap() else {
            data.db.from(metaRelations).select(metaRelations.metaId(), metaRelations.exported())
                .where { metaRelations.entityId() eq thisId }
                .asSequence()
                .map { Pair(it[metaRelations.metaId()]!!, it[metaRelations.exported()]!!) }
                .toMap()
        }
        val deleteIds = oldTagIds.keys - tagIds.keys
        if(deleteIds.isNotEmpty()) {
            data.db.delete(metaRelations) { (metaRelations.entityId() eq thisId) and (metaRelations.metaId() inList deleteIds) }
        }
        if(analyseStatisticCount) {
            data.db.update(metaTag) {
                where { it.id inList deleteIds }
                set(it.cachedCount, it.cachedCount minus 1)
                set(it.updateTime, now)
            }
        }

        val addIds = tagIds - oldTagIds.keys
        if(addIds.isNotEmpty()) {
            data.db.batchInsert(metaRelations) {
                for ((addId, isExported) in addIds) {
                    item {
                        set(metaRelations.entityId(), thisId)
                        set(metaRelations.metaId(), addId)
                        set(metaRelations.exported(), isExported)
                    }
                }
            }
        }
        if(analyseStatisticCount) {
            data.db.update(metaTag) {
                where { it.id inList addIds.keys }
                set(it.cachedCount, it.cachedCount plus 1)
                set(it.updateTime, now)
            }
        }

        val changeIds = (tagIds.keys intersect oldTagIds.keys).flatMap { id ->
            val newExported = tagIds[id]
            val oldExported = oldTagIds[id]
            if(newExported != oldExported) sequenceOf(Pair(id, newExported!!)) else emptySequence()
        }
        if(changeIds.isNotEmpty()) {
            data.db.batchUpdate(metaRelations) {
                for ((changeId, isExported) in changeIds) {
                    item {
                        where { (metaRelations.entityId() eq thisId) and (metaRelations.metaId() eq changeId) }
                        set(metaRelations.exported(), isExported)
                    }
                }
            }
        }
    }

    /**
     * 删除此关系关联的全部tag。
     * @param remainNotExported 保留not exported的tag，也就是只删除exported tag。
     */
    fun <R : EntityMetaRelationTable<*>, T : MetaTagTable<*>> deleteMetaTags(id: Int, metaRelations: R, metaTag: T, analyseStatisticCount: Boolean, remainNotExported: Boolean = false) {
        val condition = (metaRelations.entityId() eq id).runIf(remainNotExported) { this and metaRelations.exported() }
        if(analyseStatisticCount) {
            val ids = data.db.from(metaRelations).select(metaRelations.metaId()).where { condition }.map { it[metaRelations.metaId()]!! }
            data.db.delete(metaRelations) { condition }
            //修改统计计数
            data.db.update(metaTag) {
                where { it.id inList ids }
                set(it.cachedCount, it.cachedCount minus 1)
                set(it.updateTime, Instant.now())
            }
        }else{
            data.db.delete(metaRelations) { condition }
        }
    }

    /**
     * 取得此关联对象的关系上的全部not exported的关联标签。
     */
    fun <R : EntityMetaRelationTable<*>, T : MetaTagTable<M>, M : Any> getNotExportMetaTags(id: Int, metaRelations: R, metaTag: T): List<M> {
        return data.db.from(metaRelations)
            .innerJoin(metaTag, metaRelations.metaId() eq metaTag.id)
            .select(metaTag.columns)
            .where { (metaRelations.entityId() eq id) and (metaRelations.exported().not()) }
            .map { metaTag.createEntity(it) }
    }

    /**
     * 判断此关系直接关联(not exported)的对象是否存在。存在任意一个即返回true。
     */
    fun <R> getNotExportedMetaCount(id: Int, metaRelations: R): Int where R: EntityMetaRelationTable<*> {
        return data.db.from(metaRelations).select(count().aliased("count"))
            .where { (metaRelations.entityId() eq id) and (metaRelations.exported().not()) }
            .firstOrNull()?.getInt("count") ?: 0
    }
}