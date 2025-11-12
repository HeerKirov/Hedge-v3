package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.functions.kit.TopicKit
import com.heerkirov.hedge.server.functions.manager.SourceMappingManager
import com.heerkirov.hedge.server.functions.manager.query.QueryManager
import com.heerkirov.hedge.server.dto.filter.TopicFilter
import com.heerkirov.hedge.server.dto.form.*
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.MetaType
import com.heerkirov.hedge.server.enums.TagTopicType
import com.heerkirov.hedge.server.events.MetaTagCreated
import com.heerkirov.hedge.server.events.MetaTagDeleted
import com.heerkirov.hedge.server.events.MetaTagUpdated
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.manager.MetaKeywordManager
import com.heerkirov.hedge.server.utils.business.collectBulkResult
import com.heerkirov.hedge.server.utils.business.toListResult
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.first
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.runIf
import com.heerkirov.hedge.server.utils.tuples.Tuple2
import com.heerkirov.hedge.server.utils.tuples.Tuple3
import com.heerkirov.hedge.server.utils.types.*
import org.ktorm.dsl.*
import org.ktorm.entity.*
import java.time.Instant

class TopicService(private val appdata: AppDataManager,
                   private val data: DataRepository,
                   private val bus: EventBus,
                   private val kit: TopicKit,
                   private val queryManager: QueryManager,
                   private val keywordManager: MetaKeywordManager,
                   private val sourceMappingManager: SourceMappingManager) {
    private val orderTranslator = OrderTranslator {
        "id" to Topics.id
        "name" to Topics.name
        "score" to Topics.score nulls last
        "count" to Topics.cachedCount nulls last
        "ordinal" to Topics.ordinal
        "createTime" to Topics.createTime
        "updateTime" to Topics.updateTime
    }

    fun list(filter: TopicFilter): ListResult<TopicRes> {
        val schema = if(filter.query.isNullOrBlank()) null else {
            queryManager.querySchema(filter.query, QueryManager.Dialect.TOPIC).executePlan ?: return ListResult(0, emptyList())
        }
        val rootAliased = Topics.aliased("tr")
        return data.db.from(Topics)
            .leftJoin(rootAliased, rootAliased.id eq Topics.parentRootId)
            .let { schema?.joinConditions?.fold(it) { acc, join -> if(join.left) acc.leftJoin(join.table, join.condition) else acc.innerJoin(join.table, join.condition) } ?: it }
            .select(*Topics.columns.toTypedArray(), rootAliased.id, rootAliased.name, rootAliased.type)
            .whereWithConditions {
                if(filter.favorite != null) { it += Topics.favorite eq filter.favorite }
                if(filter.type != null) { it += Topics.type eq filter.type }
                if(filter.parentId != null) { it += Topics.parentId eq filter.parentId }
                if(schema != null && schema.whereConditions.isNotEmpty()) {
                    it.addAll(schema.whereConditions)
                }
            }
            .runIf(schema?.distinct == true) { groupBy(Topics.id) }
            .orderBy(orderTranslator, filter.order, schema?.orderConditions, default = ascendingOrderItem("id"))
            .limit(filter.offset, filter.limit)
            .toListResult {
                val root = it[rootAliased.id]?.let { rootId -> Tuple3(rootId, it[rootAliased.name]!!, it[rootAliased.type]!!) }
                newTopicRes(Topics.createEntity(it), root, appdata.setting.meta.topicColors)
            }
    }

    /**
     * @throws AlreadyExists ("Topic", "name", string) 此名称的topic已存在
     * @throws RecursiveParentError parentId出现闭环
     * @throws IllegalConstraintError ("type", "parent", TopicType[]) 当前的type与parent的type不兼容。给出parent的type
     * @throws ResourceNotExist ("parentId", number) 给出的parent不存在。给出parentId
     * @throws ResourceNotExist ("site", string) 更新source mapping tags时给出的site不存在
     * @throws ResourceNotExist ("sourceTagType", string[]) 更新source mapping tags时列出的tagType不存在
     */
    fun create(form: TopicCreateForm): Int {
        data.db.transaction {
            val (parentId, parentRootId) = if(form.parentId != null) kit.validateParent(form.parentId, form.type) else Tuple2(null, null)

            val name = kit.validateName(form.name, form.type, parentRootId)
            val otherNames = kit.validateOtherNames(form.otherNames)
            val implicitNames = kit.generateImplicitNames(name, otherNames)
            val keywords = kit.validateKeywords(form.keywords)

            val topicCountInParent by lazy {
                data.db.sequenceOf(Topics)
                    .filter { if(form.parentId != null) { Topics.parentId eq form.parentId }else{ Topics.parentId.isNull() } }
                    .count()
            }

            //未指定ordinal时，将其排在序列的末尾，相当于当前的序列长度
            //已指定ordinal时，按照指定的ordinal排序，并且不能超出[0, count]的范围
            //自己作为根标签时，不需要调整ordinal，直接设定为0
            val ordinal = if(parentRootId == null) {
                0
            }else if(form.ordinal == null) {
                topicCountInParent
            }else when {
                form.ordinal <= 0 -> 0
                form.ordinal >= topicCountInParent -> topicCountInParent
                else -> form.ordinal
            }.also { ordinal ->
                data.db.update(Topics) {
                    //同parent下，ordinal>=newOrdinal的那些topic，向后顺延一位
                    where { if(form.parentId != null) { Topics.parentId eq form.parentId }else{ Topics.parentId.isNull() } and (it.ordinal greaterEq ordinal)  }
                    set(it.ordinal, it.ordinal + 1)
                }
            }

            val createTime = Instant.now()

            val id = data.db.insertAndGenerateKey(Topics) {
                set(it.globalOrdinal, ordinal)
                set(it.ordinal, ordinal)
                set(it.name, name)
                set(it.otherNames, otherNames)
                set(it.implicitNames, implicitNames)
                set(it.parentId, parentId)
                set(it.parentRootId, parentRootId)
                set(it.keywords, keywords)
                set(it.description, form.description)
                set(it.type, form.type)
                set(it.favorite, form.favorite)
                set(it.score, form.score)
                set(it.cachedCount, 0)
                set(it.createTime, createTime)
                set(it.updateTime, createTime)
            } as Int

            val verifyId = data.db.from(Topics).select(max(Topics.id).aliased("id")).first().getInt("id")
            if(verifyId != id) {
                throw RuntimeException("Topic insert failed. generatedKey is $id but queried verify id is $verifyId.")
            }

            if(!form.keywords.isNullOrEmpty()) keywordManager.updateByKeywords(MetaType.TOPIC, form.keywords)

            form.mappingSourceTags?.also { sourceMappingManager.update(MetaType.TOPIC, id, it) }

            bus.emit(MetaTagCreated(id, MetaType.TOPIC))

            return id
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun get(id: Int): TopicDetailRes {
        val topic = data.db.sequenceOf(Topics).firstOrNull { it.id eq id } ?: throw be(NotFound())
        val parents = kit.getAllParents(topic)
        val children = kit.getAllChildren(topic, appdata.setting.meta.topicColors)
        val mappingSourceTags = sourceMappingManager.query(MetaType.TOPIC, id)
        return newTopicDetailRes(topic, parents, children, appdata.setting.meta.topicColors, mappingSourceTags)
    }

    /**
     * @throws NotFound 请求对象不存在
     * @throws AlreadyExists ("Topic", "name", string) 此名称的topic已存在
     * @throws RecursiveParentError parentId出现闭环
     * @throws IllegalConstraintError ("type", "children" | "parent", TopicType[]) 当前的type与parent|children的type不兼容。给出parent|children的type
     * @throws ResourceNotExist ("parentId", number) 给出的parent不存在。给出parentId
     * @throws ResourceNotExist ("site", string) 更新source mapping tags时给出的site不存在
     * @throws ResourceNotExist ("sourceTagType", string[]) 更新source mapping tags时列出的tagType不存在
     */
    fun update(id: Int, form: TopicUpdateForm) {
        data.db.transaction {
            val record = data.db.sequenceOf(Topics).firstOrNull { it.id eq id } ?: throw be(NotFound())

            val newType = form.type.isPresentThen { it != record.type }.alsoOpt { type -> kit.checkChildrenType(id, type) }

            val newParentTuple = if(form.parentId.isPresentAnd { it != record.parentId } || newType.isPresent) {
                //parent的值发生了变化，或者其类型发生了改变
                val parentId = form.parentId.unwrapOr { record.parentId }
                //在这种情况下，重新校验生成parentId
                if(parentId != null) optOf(kit.validateParent(parentId, newType.unwrapOr { record.type }, id))
                else optOf(Tuple2(null, null))
            }else undefined()

            val newOrdinal = if(newParentTuple.isPresentAnd { (parentId, _) -> parentId != record.parentId }) {
                //parentId发生了变化
                val (newParentId, newParentRootId) = newParentTuple.value
                //如果旧的parent存在且parentRoot存在，则调整旧的parent下的元素顺序。parentRoot如果不存在，表示当前节点不在树下，因此不应该调整
                if(record.parentId != null && record.parentRootId != null) {
                    data.db.update(Topics) {
                        where { Topics.parentId eq record.parentId and (it.ordinal greater record.ordinal) }
                        set(it.ordinal, it.ordinal - 1)
                    }
                }
                //如果新的parent存在且parentRoot存在，则计算新的ordinal。parentRoot如果不存在，表示当前节点不在树下，因此不需要计算
                if(newParentId != null && newParentRootId != null) {
                    val topicCountInNewParent = data.db.sequenceOf(Topics)
                        .filter { Topics.parentId eq newParentId }
                        .count()
                    form.ordinal.letOpt { ordinal ->
                        //指定了新的ordinal
                        val newOrdinal = if(ordinal > topicCountInNewParent) topicCountInNewParent else ordinal
                        //调整新的parent下的元素顺序
                        data.db.update(Topics) {
                            where { Topics.parentId eq newParentId and (it.ordinal greaterEq newOrdinal) }
                            set(it.ordinal, it.ordinal + 1)
                        }
                        newOrdinal
                    }.elseOr {
                        topicCountInNewParent
                    }
                }else if(record.ordinal != 0) {
                    //如果不在树下，则将顺序调整至0
                    optOf(0)
                }else{
                    undefined()
                }
            }else if(form.ordinal.isPresentAnd { it != record.ordinal && record.parentRootId != null && record.parentId != null }) {
                //parent没有变化，且ordinal变化，则只在当前范围内变动。前提是parentRoot存在，如果不存在则和上述一样，ordinal没有意义
                val topicCountInParent = data.db.sequenceOf(Topics)
                    .filter { Topics.parentId eq record.parentId!! }
                    .count()
                val newOrdinal = if(form.ordinal.value > topicCountInParent) topicCountInParent else form.ordinal.value
                if(newOrdinal > record.ordinal) {
                    //插入位置在原位置之后时，实际上会使夹在中间的项前移，为了保证插入顺位与想要的顺位保持不变，因此final ordinal位置是要-1的。
                    data.db.update(Topics) {
                        where { Topics.parentId eq record.parentId!! and (it.ordinal greater record.ordinal) and (it.ordinal lessEq (newOrdinal - 1)) }
                        set(it.ordinal, it.ordinal - 1)
                    }
                    optOf(newOrdinal - 1)
                }else{
                    //插入位置在原位置之前，则不需要final ordinal变更
                    data.db.update(Topics) {
                        where { Topics.parentId eq record.parentId!! and (it.ordinal greaterEq newOrdinal) and (it.ordinal less record.ordinal) }
                        set(it.ordinal, it.ordinal + 1)
                    }
                    optOf(newOrdinal)
                }
            }else{
                undefined()
            }

            val newName = if(form.name.isPresentAnd { it != record.name } || newParentTuple.isPresent || newType.isPresent) {
                //name/parentId/type变化时，需要重新校验名称重复
                val name = form.name.unwrapOr { record.name }
                val parentRootId = if(newParentTuple.isPresent) newParentTuple.unwrap { f2 } else record.parentRootId
                val type = form.type.unwrapOr { record.type }
                val validatedName = kit.validateName(name, type, parentRootId, id)
                //校验通过。只有在name确实变化时，才提交一个opt以更改值
                if(form.name.isPresent) optOf(validatedName) else undefined()
            }else undefined()
            val newOtherNames = form.otherNames.isPresentThen { (it ?: emptyList()) != record.otherNames }.letOpt { kit.validateOtherNames(it) }
            val newKeywords = form.keywords.isPresentThen { (it ?: emptyList()) != record.keywords }.letOpt { kit.validateKeywords(it) }
            val newDescription = form.description.isPresentThen { it != record.description }
            val newFavorite = form.favorite.isPresentThen { it != record.favorite }
            val newScore = form.score.isPresentThen { it != record.score }

            val newImplicitName = if(newName.isPresent || newOtherNames.isPresent) { optOf(kit.generateImplicitNames(newName.unwrapOr { record.name }, newOtherNames.unwrapOr { record.otherNames })) }else{ undefined() }

            val sourceTagMappingSot = form.mappingSourceTags.letOpt { sourceMappingManager.update(MetaType.TOPIC, id, it ?: emptyList()) }.unwrapOr { false }

            if(newKeywords.isPresent) keywordManager.updateByKeywords(MetaType.TOPIC, newKeywords.value, record.keywords)

            if(anyOpt(newOrdinal, newName, newOtherNames, newKeywords, newParentTuple, newType, newDescription, newFavorite, newScore)) {
                data.db.update(Topics) {
                    where { it.id eq id }
                    newOrdinal.applyOpt { set(it.ordinal, this) }
                    newName.applyOpt { set(it.name, this) }
                    newOtherNames.applyOpt { set(it.otherNames, this) }
                    newImplicitName.applyOpt { set(it.implicitNames, this) }
                    newParentTuple.applyOpt {
                        set(it.parentId, this.f1)
                        set(it.parentRootId, this.f2)
                    }
                    newKeywords.applyOpt { set(it.keywords, this) }
                    newType.applyOpt { set(it.type, this) }
                    newDescription.applyOpt { set(it.description, this) }
                    newFavorite.applyOpt { set(it.favorite, this) }
                    newScore.applyOpt { set(it.score, this) }
                }
            }

            if(newParentTuple.isPresent || newType.isPresent) {
                //当parent/type变化时，需要重新导出所有children的parentRootId
                kit.exportChildren(id, newType.unwrapOr { record.type }, newParentTuple.map { it.f1 }.unwrapOr { record.parentId })
            }

            val parentSot = newParentTuple.isPresentAnd { (p, _) -> p != record.parentId } || newOrdinal.isPresentAnd { o -> o != record.ordinal }
            val listUpdated = anyOpt(newName, newOtherNames, newKeywords, newType, newFavorite, newScore)
            val detailUpdated = listUpdated || parentSot || sourceTagMappingSot || newDescription.isPresent
            if(listUpdated || detailUpdated) {
                bus.emit(MetaTagUpdated(id, MetaType.TOPIC, listUpdated = listUpdated, detailUpdated = true, sourceTagMappingSot = sourceTagMappingSot, parentSot = parentSot))
            }
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun delete(id: Int) {
        data.db.transaction {
            val record = data.db.sequenceOf(Topics).firstOrNull { it.id eq id } ?: throw be(NotFound())

            keywordManager.updateByKeywords(MetaType.TOPIC, emptyList(), record.keywords)

            data.db.delete(Topics) { it.id eq id }
            data.db.delete(IllustTopicRelations) { it.topicId eq id }
            data.db.delete(BookTopicRelations) { it.topicId eq id }
            data.db.update(Topics) {
                //删除topic时，不会像tag那样递归删除子标签，而是将子标签的parent设为null。
                where { it.parentId eq id }
                set(it.parentId, null)
            }

            //处理后面邻近记录ordinal
            if(record.parentId != null && record.parentRootId != null) {
                data.db.update(Topics) {
                    where { it.parentId eq record.parentId and (it.ordinal greater record.ordinal) }
                    set(it.ordinal, it.ordinal - 1)
                }
            }

            bus.emit(MetaTagDeleted(id, MetaType.TOPIC))
        }
    }

    /**
     * 对topic进行声明式的批量操作。
     */
    fun bulk(bulks: List<TopicBulkForm>): BulkResult<String> {
        return collectBulkResult({ it.name }) {
            fun recursive(bulks: List<TopicBulkForm>, parentId: Int?, parentRoot: Pair<Int, TagTopicType>?) {
                bulks.forEachIndexed { index, form ->
                    val res = item(form) {
                        //在定位目标时，采取的方案是符合topic的根节点定位，即name符合、根标签相同的项会被确认为目标项
                        val record = data.db.sequenceOf(Topics).firstOrNull { (it.name eq form.name) and if(parentRoot != null) (it.parentRootId eq parentRoot.first) else (it.parentRootId.isNull()) }

                        if(record == null) {
                            //当给出rename字段时，此操作被强制为更新操作，因此当走到这里时要报NotFound
                            val id = if(form.rename.isPresent) throw be(NotFound()) else create(TopicCreateForm(
                                form.name, form.otherNames.unwrapOrNull(), index, parentId, form.type.unwrapOr { TagTopicType.UNKNOWN },
                                form.keywords.unwrapOrNull(), form.description.unwrapOr { "" },
                                form.favorite.unwrapOr { false }, form.score.unwrapOrNull(), form.mappingSourceTags.unwrapOrNull()
                            ))
                            Pair(id, form.type.unwrapOr { TagTopicType.UNKNOWN })
                        }else{
                            val formOrdinal = if(parentId != null && record.ordinal != index) optOf(index) else undefined()
                            update(record.id, TopicUpdateForm(
                                form.rename, form.otherNames, formOrdinal, optOf(parentId), form.type,
                                form.keywords, form.description,
                                form.favorite, form.score, form.mappingSourceTags
                            ))
                            Pair(record.id, form.type.unwrapOr { record.type })
                        }
                    }
                    if(res != null && !form.children.isNullOrEmpty()) {
                        //检查是否要为下一级更替parentRoot。
                        //如果当前已存在IP类型的root，则不会进行任何更替；
                        //如果当前已存在COPYRIGHT类型的root，且当前节点为IP类型，则更替为当前节点；
                        //如果当前不存在root，且当前节点为IP/COPYRIGHT类型，则更替为当前节点。
                        //否则不进行更替。
                        recursive(form.children, res.first, if(parentRoot?.second == TagTopicType.IP) {
                            parentRoot
                        }else if(parentRoot?.second == TagTopicType.COPYRIGHT && res.second == TagTopicType.IP) {
                            res
                        }else if(parentRoot == null && (res.second == TagTopicType.IP || res.second == TagTopicType.COPYRIGHT)) {
                            res
                        }else{
                            parentRoot
                        })
                    }
                }
            }

            recursive(bulks, null, null)
        }
    }
}