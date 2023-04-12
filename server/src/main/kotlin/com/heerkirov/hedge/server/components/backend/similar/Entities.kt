package com.heerkirov.hedge.server.components.backend.similar

import com.heerkirov.hedge.server.enums.FindSimilarEntityType
import com.heerkirov.hedge.server.enums.SourceMarkType
import com.heerkirov.hedge.server.model.ImportImage
import com.heerkirov.hedge.server.model.SourceTag
import com.heerkirov.hedge.server.utils.types.FindSimilarEntityKey
import java.time.LocalDate

/**
 * 用于在工作单元中携带更多详细信息的信息单元。
 * 携带的信息一方面用于filter by时，依据这些信息立刻决定要查询的条件；另一方面用于find by时，依据这些信息做出判断。
 * 在一开始就尽可能查出更多信息，以避免日后再做详情查询。
 */
sealed interface EntityInfo {
    val id: Int
    val partitionTime: LocalDate
    val sourceTags: List<SourceTag>
    val sourceIdentity: Triple<String, Long, Int?>?
    val sourceRelations: List<Long>?
    val sourceBooks: List<Int>?
    val sourceMarks: List<Pair<Int, SourceMarkType>>?
    val similarityVector: Any?
}

/**
 * illust类型。
 * @param partitionTime 用于filter by partitionTime
 * @param sourceTags 用于filter by sourceTagTypes
 * @param topics 用于filter by topic
 * @param authors 用于filter by author
 * @param similarityVector 用于find by similarity
 * @param sourceIdentity 用于find by source identity
 * @param sourceRelations 用于find by source relation: relations
 * @param sourceBooks 用于find by source relation: books
 * @param sourceMarks 用于find by source mark
 * @param collectionId 用于关系增补环节的collection增补
 */
data class IllustEntityInfo(override val id: Int,
                            override val partitionTime: LocalDate,
                            override val sourceTags: List<SourceTag>,
                            override val sourceIdentity: Triple<String, Long, Int?>?,
                            override val sourceRelations: List<Long>?,
                            override val sourceBooks: List<Int>?,
                            override val sourceMarks: List<Pair<Int, SourceMarkType>>?,
                            override val similarityVector: Any?,
                            val collectionId: Int?,
                            val authors: List<Int>,
                            val topics: List<Int>) : EntityInfo

/**
 * import image类型。
 * @param partitionTime 用于filter by partitionTime
 * @param sourceTags 用于filter by sourceTagTypes
 * @param similarityVector 用于find by similarity
 * @param sourceIdentity 用于find by source identity
 * @param sourceRelations 用于find by source relation: relations
 * @param sourceBooks 用于find by source relation: books
 * @param sourceMarks 用于find by source mark
 */
data class ImportImageEntityInfo(override val id: Int,
                                 override val partitionTime: LocalDate,
                                 override val sourceTags: List<SourceTag>,
                                 override val sourceIdentity: Triple<String, Long, Int?>?,
                                 override val sourceRelations: List<Long>?,
                                 override val sourceBooks: List<Int>?,
                                 override val sourceMarks: List<Pair<Int, SourceMarkType>>?,
                                 override val similarityVector: Any?,
                                 val collectionId: Any?,
                                 val bookIds: List<Int>,
                                 val cloneImage: ImportImage.CloneImageFrom?) : EntityInfo

/**
 * 工作单元的图节点。
 */
data class GraphNode(val key: FindSimilarEntityKey, val info: EntityInfo, val relations: MutableSet<GraphRelation>)

/**
 * 工作单元的图关系。
 */
class GraphRelation(val another: GraphNode, val relations: MutableList<RelationType>)

/**
 * 关系类型与附加信息。
 */
sealed interface RelationType

/**
 * source identity相等或近似。
 */
data class SourceIdentityRelationType(var site: String, var sourceId: Long, var sourcePart: Int?, var equal: Boolean) : RelationType

/**
 * source relation/books有关联。
 */
data class SourceRelatedRelationType(var hasRelations: Boolean, var sameBooks: MutableSet<Int>?) : RelationType

/**
 * source mark已被标记。
 */
data class SourceMarkRelationType(var markType: SourceMarkType) : RelationType

/**
 * similarity达到近似阈值。
 */
data class SimilarityRelationType(var similarity: Double, var level: Int) : RelationType

/**
 * 已存在的关系类型。
 */
data class ExistedRelationType(var sameCollectionId: Int? = null,
                               var samePreCollection: String? = null,
                               var sameBooks: MutableSet<Int>? = null,
                               var sameAssociate: Boolean = false,
                               var ignored: Boolean = false) : RelationType

fun EntityInfo.toEntityKey(): FindSimilarEntityKey {
    return FindSimilarEntityKey(if(this is IllustEntityInfo) FindSimilarEntityType.ILLUST else FindSimilarEntityType.IMPORT_IMAGE, this.id)
}