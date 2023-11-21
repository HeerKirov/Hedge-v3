package com.heerkirov.hedge.server.components.backend.similar

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.FindSimilarResults
import com.heerkirov.hedge.server.events.SimilarFinderResultCreated
import com.heerkirov.hedge.server.events.SimilarFinderResultUpdated
import com.heerkirov.hedge.server.model.FindSimilarResult
import org.ktorm.dsl.*
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import java.time.Instant
import java.util.*

class RecordBuilder(private val data: DataRepository, private val bus: EventBus) {
    private val components = mutableSetOf<Map<Int, GraphVertex>>()

    /**
     * 载入一个图，进行处理，将此图拆分为数个连通分量，随后生成记录。
     */
    fun loadGraph(graph: Map<Int, GraphVertex>) {
        val accessedVertices = mutableSetOf<Int>()
        for ((key, vertex) in graph) {
            if(key !in accessedVertices) {
                traverse(vertex, graph, accessedVertices)
            }
        }
    }

    /**
     * 从一个节点开始遍历，以生成连通分量。
     */
    private fun traverse(baseVertex: GraphVertex, graph: Map<Int, GraphVertex>, accessedVertices: MutableSet<Int>) {
        val accessed = mutableSetOf<Int>()
        val accessedCoverages = mutableSetOf<GraphCoverage>()
        val queue = LinkedList<GraphVertex>().apply { add(baseVertex) }

        queue.add(baseVertex)
        accessed.add(baseVertex.key)
        accessedVertices.add(baseVertex.key)

        //遍历算法只需要从一个节点出发，沿着有效关系，标记它所有经过的节点即可
        while (queue.isNotEmpty()) {
            val vertex = queue.pop()

            for (edge in vertex.edges) {
                //检测此边连接的下一个节点是否已被访问过
                //依次访问与此节点连接的所有节点。若两者的连接关系不存在existedRelation，且在coverage中也不存在通过existedRelation的连接，则视为有效连通
                if(edge.another.key !in accessedVertices && !edge.isExistedRelation() && vertex.coverages.none { it.isExistedRelation() && edge.another in it.vertices }) {
                    queue.add(edge.another)
                    accessed.add(edge.another.key)
                    accessedVertices.add(edge.another.key)
                }
            }

            for (coverage in vertex.coverages) {
                //检出此节点涉及的[非]existedRelation的覆盖，访问此覆盖的所有子节点
                if(coverage !in accessedCoverages && !coverage.isExistedRelation()) {
                    //需要过滤覆盖映射的节点，选取的节点是未访问过的，且未在edges中存在existedRelation
                    var any = false
                    for(another in coverage.vertices) {
                        if(another.key != vertex.key && another.key !in accessedVertices && vertex.edges.none { edge -> another == edge.another && edge.isExistedRelation() }) {
                            queue.add(another)
                            accessed.add(another.key)
                            accessedVertices.add(another.key)
                            any = true
                        }
                    }
                    if(any) accessedCoverages.add(coverage)
                }
            }
        }

        if(accessed.size > 1) {
            val component = mutableMapOf<Int, GraphVertex>()

            //完成遍历后，将所有标记节点摘出。同时摘出所有连接了两个accessed节点的边，构成连通分量。coverages暂时留空，下面再处理
            for (entityKey in accessed) {
                val graphNode = graph[entityKey]!!
                val componentEdges = graphNode.edges.filter { it.another.key in accessed }.toMutableSet()
                val componentVertex = GraphVertex(graphNode.key, graphNode.entity, componentEdges, mutableSetOf())
                component[entityKey] = componentVertex
            }

            //摘出所有至少有两个标记节点的coverage，将其节点映射为新节点，然后把新生成的coverage替换加入它包含的节点
            for (coverage in accessed.asSequence().flatMap { graph[it]!!.coverages }.distinct()) {
                val filteredVertices = coverage.vertices.mapNotNull { component[it.key] }.toMutableSet()
                if(filteredVertices.size > 1) {
                    val transformedCoverage = GraphCoverage(filteredVertices, coverage.type, coverage.ignored)
                    for (vertex in filteredVertices) {
                        vertex.coverages.add(transformedCoverage)
                    }
                }
            }

            components.add(component)
        }
    }

    /**
     * 根据图结果，生成record记录。
     */
    fun generateRecords() {
        var createNum = 0
        val updated = mutableListOf<Int>()
        data.db.transaction {
            for (component in components) {
                //首先去数据库，检查一下是否可能存在有重合节点。若存在重合节点，就认为两个分量是连通的

                //在component.keys数量较大时，会触发SQLite的parser stack overflow。
                //为解决这个问题，一次连接的OR条件不能太多。(测试的最多数量是88)
                //在这里使用10条为一组，拆分成多条查询。
                val existResult = component.keys.asSequence().chunked(10)
                    .map { li -> li.map { "%|$it|%" }.map { FindSimilarResults.imageIds like it }.reduce { a, b -> a or b } }
                    .map { condition -> data.db.sequenceOf(FindSimilarResults).firstOrNull { condition } }
                    .filterNotNull()
                    .firstOrNull()

                if(existResult != null) {
                    val recordId = generateRecordToExist(component, existResult)
                    updated.add(recordId)
                }else{
                    generateNewRecord(component)
                    createNum += 1
                }
            }
        }
        //发送db写入的变更事件
        if(createNum > 0) {
            bus.emit(SimilarFinderResultCreated(createNum))
        }
        if(updated.isNotEmpty()) {
            bus.emit(updated.map { SimilarFinderResultUpdated(it) })
        }
    }

    /**
     * 将连通分量追加到已有的记录。
     */
    private fun generateRecordToExist(component: Map<Int, GraphVertex>, target: FindSimilarResult): Int {
        val imageIds = (component.keys + target.edges.asSequence().flatMap { sequenceOf(it.a, it.b) }.toSet()).toList()

        val edges = mergeEdges(
            target.edges.associateBy({ it.a to it.b }) { it.types },
            component.values.asSequence()
                .flatMap { node ->
                    node.edges.asSequence()
                        .filter { node.key < it.another.key }
                        .map { Pair(node.key, it.another.key) to it.relations }
                }
                .toMap()
        ).map { (k, v) -> FindSimilarResult.RelationEdge(k.first, k.second, v) }

        val coverages = mergeCoverages(
            component.values.asSequence()
                .flatMap { it.coverages }
                .distinct()
                .map { FindSimilarResult.RelationCoverage(it.vertices.map(GraphVertex::key), it.type, it.ignored) }
                .toList(),
            target.coverages
        )

        val edgeTypes = component.values.asSequence().flatMap { it.edges }.flatMap { it.relations }.toSet() + target.edges.asSequence().flatMap { it.types }.toSet()
        val category = getSimilarityCategory(edgeTypes)
        val summaryType = getSummaryType(edgeTypes)

        data.db.update(FindSimilarResults) {
            where { it.id eq target.id }
            set(it.category, category)
            set(it.summaryType, summaryType)
            set(it.imageIds, imageIds)
            set(it.edges, edges)
            set(it.coverages, coverages)
            set(it.resolved, false)
            set(it.recordTime, Instant.now())
        }

        return target.id
    }

    /**
     * 生成一条新的记录。
     */
    private fun generateNewRecord(component: Map<Int, GraphVertex>) {
        val images = component.keys.toList()
        val edges = component.values.asSequence()
            .flatMap { vertex -> vertex.edges.asSequence().map { edge -> Triple(vertex.key, edge.another.key, edge.relations) } }
            .filter { (a, b, _) -> a < b }
            .map { (a, b, i) -> FindSimilarResult.RelationEdge(a, b, i) }
            .toList()
        val coverages = component.values.asSequence()
            .flatMap { it.coverages }
            .distinct()
            .map { c -> FindSimilarResult.RelationCoverage(c.vertices.map { it.key }, c.type, c.ignored) }
            .toList()
        val edgeTypes = component.values.asSequence().flatMap { it.edges }.flatMap { it.relations }.toSet()
        val category = getSimilarityCategory(edgeTypes)
        val summaryType = getSummaryType(edgeTypes)

        data.db.insert(FindSimilarResults) {
            set(it.category, category)
            set(it.summaryType, summaryType)
            set(it.imageIds, images)
            set(it.edges, edges)
            set(it.coverages, coverages)
            set(it.resolved, false)
            set(it.recordTime, Instant.now())
        }
    }
}