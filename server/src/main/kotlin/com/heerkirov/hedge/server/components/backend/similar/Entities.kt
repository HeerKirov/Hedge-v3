package com.heerkirov.hedge.server.components.backend.similar

import com.heerkirov.hedge.server.model.FindSimilarResult
import com.heerkirov.hedge.server.model.SourceTag
import java.time.LocalDate

/**
 * 用于在工作单元中携带更多详细信息的信息单元。
 * 携带的信息一方面用于filter by时，依据这些信息立刻决定要查询的条件；另一方面用于find by时，依据这些信息做出判断。
 * 在一开始就尽可能查出更多信息，以避免日后再做详情查询。
 */
data class EntityInfo(val id: Int,
                      val partitionTime: LocalDate,
                      val sourceTags: List<SourceTag>,
                      val sourceIdentity: SourceIdentity?,
                      val sourceRelations: List<String>?,
                      val sourceBooks: List<SourceBookIdentity>?,
                      val fingerprint: Fingerprint?,
                      val collectionId: Int?,
                      val authors: List<Int>,
                      val topics: List<Int>)

data class SourceIdentity(val sourceDataId: Int, val sourceSite: String, val sourceId: String, val sourcePart: Int?, val sourcePartName: String?)

data class SourceBookIdentity(val sourceBookId: Int, val sourceSite: String, val sourceBookCode: String)

/**
 * 指纹数据。
 */
data class Fingerprint(val pHashSimple: String, val dHashSimple: String, val pHash: String, val dHash: String)

/**
 * 工作单元的图节点。
 */
class GraphVertex(val key: Int, val entity: EntityInfo, val edges: MutableSet<GraphEdge>, val coverages: MutableSet<GraphCoverage>)

/**
 * 工作单元的图关系。
 */
class GraphEdge(val another: GraphVertex, val relations: MutableList<FindSimilarResult.RelationEdgeType>)

/**
 * 工作单元的覆盖领域。
 */
class GraphCoverage(val vertices: MutableSet<GraphVertex>, val type: FindSimilarResult.RelationCoverageType, var ignored: Boolean)

