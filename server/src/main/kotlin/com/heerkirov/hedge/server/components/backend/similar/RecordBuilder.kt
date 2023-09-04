package com.heerkirov.hedge.server.components.backend.similar

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.FindSimilarResults
import com.heerkirov.hedge.server.events.SimilarFinderResultCreated
import com.heerkirov.hedge.server.model.FindSimilarResult
import com.heerkirov.hedge.server.utils.types.FindSimilarEntityKey
import com.heerkirov.hedge.server.utils.types.toEntityKey
import com.heerkirov.hedge.server.utils.types.toEntityKeyString
import org.ktorm.dsl.*
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import java.time.Instant
import java.util.LinkedList

class RecordBuilder(private val data: DataRepository, private val bus: EventBus) {
    private val components = mutableSetOf<Map<FindSimilarEntityKey, GraphNode>>()

    /**
     * 载入一个图，进行处理，将此图拆分为数个连通分量，随后生成记录。
     */
    fun loadGraph(graph: Map<FindSimilarEntityKey, GraphNode>) {
        val accessedNodes = mutableSetOf<FindSimilarEntityKey>()
        for ((key, node) in graph) {
            if(key !in accessedNodes) {
                traverse(node, graph, accessedNodes)
            }
        }
    }

    /**
     * 从一个节点开始遍历，以生成连通分量。
     */
    private fun traverse(baseNode: GraphNode, graph: Map<FindSimilarEntityKey, GraphNode>, accessedNodes: MutableSet<FindSimilarEntityKey>) {
        val accessed = mutableSetOf<FindSimilarEntityKey>()
        val queue = LinkedList<GraphNode>()
        queue.add(baseNode)

        //遍历算法只需要从一个节点出发，沿着有效关系，标记它所有经过的节点即可。完成遍历后，将所有标记节点及其关系摘出，构成连通分量
        while (queue.isNotEmpty()) {
            val node = queue.pop()

            accessed.add(node.key)
            accessedNodes.add(node.key)

            for (relation in node.relations) {
                //检测此relation的下一个节点是否已被访问过
                //依次访问与此节点连接的所有节点。若两者的连接关系不存在“已存在的关系”，则视为有效连通
                if(relation.another.key !in accessedNodes && relation.relations.none { it is ExistedRelationType }) {
                    queue.add(relation.another)
                }
            }
        }

        if(accessed.size > 1) {
            val component = mutableMapOf<FindSimilarEntityKey, GraphNode>()

            for (entityKey in accessed) {
                val graphNode = graph[entityKey]!!
                val componentRelations = graphNode.relations.asSequence().filter { it.another.key in accessed }.toMutableSet()
                val componentNode = GraphNode(graphNode.key, graphNode.info, componentRelations)
                component[entityKey] = componentNode
            }

            components.add(component)
        }
    }

    /**
     * 根据图结果，生成record记录。
     */
    fun generateRecords() {
        data.db.transaction {
            for (component in components) {
                //首先去数据库，检查一下是否可能存在有重合节点。若存在重合节点，就认为两个分量是连通的
                val likeCondition = component.keys.map { "%|${it.toEntityKeyString()}|%" }.map { FindSimilarResults.images like it }.reduce { a, b -> a or b }
                val existResult = data.db.sequenceOf(FindSimilarResults).firstOrNull { likeCondition }

                if(existResult != null) {
                    generateRecordToExist(component, existResult)
                }else{
                    generateNewRecord(component)
                }
            }
        }
        //发送db写入的变更事件
        if(components.size > 0) {
            bus.emit(SimilarFinderResultCreated(components.size))
        }
    }

    /**
     * 将连通分量追加到已有的记录。
     */
    private fun generateRecordToExist(component: Map<FindSimilarEntityKey, GraphNode>, target: FindSimilarResult) {
        val targetRelations = target.relations.map { Triple(it.a.toEntityKey(), it.b.toEntityKey(), getRelationType(it.type, it.params)) }
        val images = (component.keys.asSequence().map { it.toEntityKeyString() }.toSet() + target.relations.asSequence().flatMap { sequenceOf(it.a, it.b) }.toSet()).toList()
        val relations = mergeRelations(
            component.values.asSequence()
                .flatMap { node ->
                    node.relations.asSequence()
                        .filter { node.key < it.another.key }
                        .map { Pair(node.key, it.another.key) to it.relations }
                }
                .toMap(),
            targetRelations
                .groupBy({ it.first to it.second }) { it.third }
        ).flatMap { (k, v) ->
            val ak = k.first.toEntityKeyString()
            val bk = k.second.toEntityKeyString()
            v.map {
                FindSimilarResult.RelationUnit(ak, bk, it.toRelationType(), it.toRecordInfo())
            }
        }

        val relationTypes = component.values.asSequence().flatMap { it.relations }.flatMap { it.relations }.toSet() + targetRelations.asSequence().map { it.third }.toSet()
        val summaryTypes = getSummaryTypes(relationTypes)
        val sortPriority = getSortPriority(summaryTypes)

        data.db.update(FindSimilarResults) {
            where { it.id eq target.id }
            set(it.summaryTypes, summaryTypes)
            set(it.images, images)
            set(it.relations, relations)
            set(it.sortPriority, sortPriority)
            set(it.recordTime, Instant.now())
        }
    }

    /**
     * 生成一条新的记录。
     */
    private fun generateNewRecord(component: Map<FindSimilarEntityKey, GraphNode>) {
        val images = component.keys.map { it.toEntityKeyString() }
        val relations = component.values.asSequence()
            .flatMap { node ->
                node.relations.asSequence().flatMap { r ->
                    r.relations.asSequence().map {
                        Triple(node.key.toEntityKeyString(), r.another.key.toEntityKeyString(), it)
                    }
                }
            }
            .filter { (a, b, _) -> a < b }
            .map { (a, b, i) -> FindSimilarResult.RelationUnit(a, b, i.toRelationType(), i.toRecordInfo()) }
            .toList()
        val relationTypes = component.values.asSequence().flatMap { it.relations }.flatMap { it.relations }.toSet()
        val summaryTypes = getSummaryTypes(relationTypes)
        val sortPriority = getSortPriority(summaryTypes)

        data.db.insert(FindSimilarResults) {
            set(it.summaryTypes, summaryTypes)
            set(it.images, images)
            set(it.relations, relations)
            set(it.sortPriority, sortPriority)
            set(it.recordTime, Instant.now())
        }
    }
}