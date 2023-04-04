package com.heerkirov.hedge.server.components.backend.similar

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.FindSimilarResults
import com.heerkirov.hedge.server.enums.SourceMarkType
import com.heerkirov.hedge.server.model.FindSimilarResult
import com.heerkirov.hedge.server.utils.DateTime
import org.ktorm.dsl.*
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import java.util.LinkedList

class RecordBuilder(private val data: DataRepository) {
    private val components = mutableSetOf<Map<EntityKey, GraphNode>>()

    /**
     * 载入一个图，进行处理，将此图拆分为数个连通分量，随后生成记录。
     */
    fun loadGraph(graph: Map<EntityKey, GraphNode>) {
        val accessedNodes = mutableSetOf<EntityKey>()
        for ((key, node) in graph) {
            if(key !in accessedNodes) {
                traverse(node, graph, accessedNodes)
            }
        }
    }

    /**
     * 从一个节点开始遍历，以生成连通分量。
     */
    private fun traverse(baseNode: GraphNode, graph: Map<EntityKey, GraphNode>, accessedNodes: MutableSet<EntityKey>) {
        val accessed = mutableSetOf<EntityKey>()
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
            val component = mutableMapOf<EntityKey, GraphNode>()

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
                val likeStr = component.keys.map { it.toEntityKeyString() }.sorted().joinToString("%|%", "%", "%")
                val existResult = data.db.sequenceOf(FindSimilarResults).firstOrNull { it.images like likeStr }

                if(existResult != null) {
                    generateRecordToExist(component, existResult)
                }else{
                    generateNewRecord(component)
                }
            }
        }
    }

    /**
     * 将连通分量追加到已有的记录。
     */
    private fun generateRecordToExist(component: Map<EntityKey, GraphNode>, target: FindSimilarResult) {

    }


    /**
     * 生成一条新的记录。
     */
    private fun generateNewRecord(component: Map<EntityKey, GraphNode>) {
        val relationTypes = component.values.asSequence().flatMap { it.relations }.flatMap { it.relations }.toSet()
        val summaryTypes = getSummaryTypes(relationTypes)
        val sortPriority = getSortPriority(summaryTypes)
        data.db.insert(FindSimilarResults) {
            set(it.summaryTypes, summaryTypes)
            //set(it.images, TODO())
            //set(it.relations, TODO())
            set(it.sortPriority, sortPriority)
            set(it.recordTime, DateTime.now())
        }
    }

    private fun getSummaryTypes(relationTypes: Set<RelationType>): FindSimilarResult.SummaryTypes {
        var same = false
        var similar = false
        var related = false
        for (it in relationTypes) {
            if(!same || !similar || !related) {
                when (it) {
                    is SourceIdentityRelationType -> {
                        if(it.equal) {
                            same = true
                        }else{
                            related = true
                        }
                    }
                    is SourceRelatedRelationType -> {
                        related = true
                    }
                    is SourceMarkRelationType -> {
                        when(it.markType) {
                            SourceMarkType.SAME -> same = true
                            SourceMarkType.SIMILAR -> similar = true
                            else -> related = true
                        }
                    }
                    is SimilarityRelationType -> {
                        if(it.level >= 2) {
                            same = true
                        }else{
                            similar = true
                        }
                    }
                    is ExistedRelationType -> {}
                }
            }
        }
        var ret: FindSimilarResult.SummaryTypes = FindSimilarResult.SummaryTypes.EMPTY
        if(same) ret += FindSimilarResult.SummaryTypes.SAME
        if(similar) ret += FindSimilarResult.SummaryTypes.SIMILAR
        if(related) ret += FindSimilarResult.SummaryTypes.RELATED
        return ret
    }

    private fun getSortPriority(summaryTypes: FindSimilarResult.SummaryTypes): Int {
        return if(FindSimilarResult.SummaryTypes.SAME in summaryTypes) {
            3
        }else if(FindSimilarResult.SummaryTypes.RELATED in summaryTypes) {
            2
        }else{
            1
        }
    }
}