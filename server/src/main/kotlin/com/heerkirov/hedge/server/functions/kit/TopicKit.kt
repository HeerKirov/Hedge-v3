package com.heerkirov.hedge.server.functions.kit

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.Topics
import com.heerkirov.hedge.server.dto.res.TopicChildrenNode
import com.heerkirov.hedge.server.enums.TagTopicType
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.model.Topic
import com.heerkirov.hedge.server.utils.business.checkTagName
import com.heerkirov.hedge.server.utils.runIf
import com.heerkirov.hedge.server.utils.tuples.Tuple2
import org.ktorm.dsl.*
import org.ktorm.entity.*
import java.util.*

class TopicKit(private val data: DataRepository) {
    /**
     * 校验并纠正name，同时对name进行查重。
     * @param parentRootId 指定此参数以说明当前项所处的分组。
     * @param thisId 指定此参数时，表示是在对一个项进行更新，此时绕过此id的记录的重名。
     * @throws AlreadyExists ("Topic", "name", string) 此名称的topic已存在
     */
    fun validateName(newName: String, type: TagTopicType, parentRootId: Int?, thisId: Int? = null): String {
        val trimName = newName.trim()

        if(!checkTagName(trimName)) throw be(ParamError("name"))
        if(data.db.sequenceOf(Topics).any {
                //满足名称相同，类型相同
                (it.name eq trimName) and (it.type eq type).runIf(type == TagTopicType.CHARACTER) {
                    //对于character，还要满足parent root相同
                    and (if(parentRootId != null) it.parentRootId eq parentRootId else it.parentRootId.isNull())
                }.runIf(thisId != null) {
                    //对于update，排除可能的自己
                    and (it.id notEq thisId!!)
                }
        }) throw be(AlreadyExists("Topic", "name", trimName))

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
     * 给出parentId时，对其进行校验，并获取根标签。报告parentId不存在的错误，报告当前type和此parent不兼容的错误。
     * @throws RecursiveParentError parentId出现闭环
     * @throws ResourceNotExist ("parentId", number) 给出的parent不存在。给出parentId
     * @throws IllegalConstraintError ("type", "parent", TopicType[]) 当前的type与parent的type不兼容。给出parent的type
     */
    fun validateParent(parentId: Int, type: TagTopicType, thisId: Int? = null): Tuple2<Int, Int?> {
        val parent = data.db.sequenceOf(Topics).firstOrNull { it.id eq parentId } ?: throw be(ResourceNotExist("parentId", parentId))
        //检测parent类型兼容性
        if(!isLegalTypeConstraint(parent.type, type)) throw be(IllegalConstraintError("type", "parent", listOf(parent.type)))

        //闭环校验以及推定parent root id
        var rootItem: Tuple2<Int, TagTopicType>? = null
        tailrec fun recursiveCheckParent(id: Int) {
            //在过去经历过的parent中发现了重复的id，判定存在闭环
            if(id == thisId) throw be(RecursiveParentError())

            val (pid, tp) = data.db.from(Topics).select(Topics.parentId, Topics.type)
                .where { Topics.id eq id }
                .limit(1)
                .map { Tuple2(it[Topics.parentId], it[Topics.type]!!) }
                .firstOrNull()
                ?: throw be(ResourceNotExist("parentId", id))

            if(type == TagTopicType.CHARACTER) {
                //仅对character类型，追溯其parent root
                if(tp == TagTopicType.IP) {
                    //ip类型的parent可以放心覆盖任何rootItem的历史记录，这样rootItem总是最上层的那个ip
                    rootItem = Tuple2(id, tp)
                }else if(tp == TagTopicType.COPYRIGHT) {
                    //只有之前不存在任何rootItem时，才能取copyright，因为默认copyright是不能覆盖work的，只有没有ip时采用copyright
                    if(rootItem == null) rootItem = Tuple2(id, tp)
                }
            }

            if(pid != null) recursiveCheckParent(pid)
        }
        recursiveCheckParent(parentId)

        return Tuple2(parentId, rootItem?.f1)
    }

    /**
     * 取得topic的所有父标签。不包括当前topic。顺序是root在前，直接父标签在后。
     */
    fun getAllParents(topic: Topic): List<Topic> {
        if(topic.parentId == null) return emptyList()

        val ret = LinkedList<Topic>()
        var current = topic
        while (current.parentId != null) {
            current = data.db.sequenceOf(Topics).first { it.id eq current.parentId!! }
            ret.push(current)
        }

        return ret
    }

    /**
     * 取得topic的所有子标签，并处理为标签树的形式。标签树中的项按创建时间排序。
     */
    fun getAllChildren(topic: Topic, topicColors: Map<TagTopicType, String>): List<TopicChildrenNode>? {
        fun generateNodeList(parentId: Int): List<TopicChildrenNode>? {
            return data.db.from(Topics).select(Topics.id, Topics.name, Topics.type)
                .where { Topics.parentId eq parentId }
                .orderBy(Topics.type.asc(), Topics.createTime.asc())
                .map { Tuple3(it[Topics.id]!!, it[Topics.name]!!, it[Topics.type]!!) }
                .map { (id, name, type) -> TopicChildrenNode(id, name, type, topicColors[type], generateNodeList(id)) }
                .ifEmpty { null }
        }

        return generateNodeList(topic.id)
    }

    /**
     * 更新type时，检验所有子标签是否能满足此新type的约束。
     * @throws IllegalConstraintError ("type", "children", TopicType[]) 当前的type与children的type不兼容。给出children的type
     */
    fun checkChildrenType(thisId: Int, type: TagTopicType) {
        val illegal = data.db.sequenceOf(Topics).filter { it.parentId eq thisId }.asKotlinSequence().filterNot { isLegalTypeConstraint(type, it.type) }.toList()
        if(illegal.isNotEmpty()) {
            throw be(IllegalConstraintError("type", "children", illegal.map { it.type }))
        }
    }

    /**
     * 重新导出当前topic下属的所有直接和间接标签。主要导出其parentRootId。
     */
    fun exportChildren(thisId: Int, type: TagTopicType, parentId: Int?) {
        //首先从自己出发推断下属应有的parent root id
        var rootItem: Tuple2<Int, TagTopicType>? = null
        //如果自己是work或character，那么自己也是其中一环
        if(type == TagTopicType.COPYRIGHT || type == TagTopicType.IP) rootItem = Tuple2(thisId, type)

        if(parentId != null) {
            tailrec fun recursiveCheckParent(id: Int) {
                val (pid, tp) = data.db.from(Topics).select(Topics.parentId, Topics.type)
                    .where { Topics.id eq id }
                    .limit(1)
                    .map { Tuple2(it[Topics.parentId], it[Topics.type]!!) }
                    .firstOrNull()
                    ?: throw be(ResourceNotExist("parentId", id))

                if(tp == TagTopicType.IP) {
                    //ip类型的parent可以放心覆盖任何rootItem的历史记录，这样rootItem总是最上层的那个work
                    rootItem = Tuple2(id, tp)
                }else if(tp == TagTopicType.COPYRIGHT) {
                    //只有之前不存在任何rootItem时，才能取copyright，因为默认copyright是不能覆盖work的，只有没有work时采用copyright
                    if(rootItem == null) rootItem = Tuple2(id, tp)
                }

                if(pid != null) recursiveCheckParent(pid)
            }
            recursiveCheckParent(parentId)
        }

        val parentRootId = rootItem?.f1

        //然后遍历所有子标签，修改它们的属性
        fun recursionUpdateProps(parentId: Int) {
            data.db.update(Topics) {
                where { (it.parentId eq parentId) and (it.type eq TagTopicType.CHARACTER) }
                set(it.parentRootId, parentRootId)
            }
            data.db.from(Topics).select(Topics.id).where { Topics.parentId eq parentId }.map { it[Topics.id]!! }.forEach(::recursionUpdateProps)
        }

        recursionUpdateProps(thisId)
    }

    /**
     * 校验child和parent之间的类型约束是否合法。
     */
    private fun isLegalTypeConstraint(parent: TagTopicType, child: TagTopicType): Boolean {
        return child == TagTopicType.UNKNOWN || parent == TagTopicType.UNKNOWN
                || (child == TagTopicType.IP && (parent == TagTopicType.IP || parent == TagTopicType.COPYRIGHT))
                || (child == TagTopicType.CHARACTER && (parent == TagTopicType.IP || parent == TagTopicType.COPYRIGHT || parent == TagTopicType.CHARACTER))
    }
}