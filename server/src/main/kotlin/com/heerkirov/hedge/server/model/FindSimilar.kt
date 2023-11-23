package com.heerkirov.hedge.server.model

import com.fasterxml.jackson.annotation.JsonSubTypes
import com.fasterxml.jackson.annotation.JsonTypeInfo
import com.heerkirov.hedge.server.dto.res.SourceTagPath
import com.heerkirov.hedge.server.utils.composition.Composition
import java.time.Instant
import java.time.LocalDate

data class FindSimilarTask(val id: Int,
                           /**
                            * 此task的查询范围。
                            */
                           val selector: TaskSelector,
                           /**
                            * 此task的查询选项。
                            */
                           val config: TaskConfig,
                           /**
                            * 创建此单位的时间。
                            */
                           val recordTime: Instant) {

    @JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "type")
    @JsonSubTypes(value = [
        JsonSubTypes.Type(value = TaskSelectorOfImages::class, name = "image"),
        JsonSubTypes.Type(value = TaskSelectorOfPartition::class, name = "partitionTime"),
        JsonSubTypes.Type(value = TaskSelectorOfBook::class, name = "book"),
        JsonSubTypes.Type(value = TaskSelectorOfTopic::class, name = "topic"),
        JsonSubTypes.Type(value = TaskSelectorOfAuthor::class, name = "author"),
        JsonSubTypes.Type(value = TaskSelectorOfSourceTag::class, name = "sourceTag"),
    ])
    sealed interface TaskSelector

    data class TaskSelectorOfImages(val imageIds: List<Int>) : TaskSelector

    data class TaskSelectorOfPartition(val partitionTime: LocalDate) : TaskSelector

    data class TaskSelectorOfBook(val bookIds: List<Int>) : TaskSelector

    data class TaskSelectorOfTopic(val topicIds: List<Int>) : TaskSelector

    data class TaskSelectorOfAuthor(val authorIds: List<Int>) : TaskSelector

    data class TaskSelectorOfSourceTag(val sourceTags: List<SourceTagPath>) : TaskSelector

    /**
     * @param findBySourceIdentity 根据来源一致性做判定，要求id+part相同或partName相同。
     * @param findBySourcePart 根据来源part近似性做判定，要求id相同而part不同。
     * @param findBySourceRelation 根据source relation做判定。
     * @param findBySourceBook 根据source book做判定。
     * @param findBySimilarity 根据相似度做判定。
     * @param filterInCurrentScope 匹配当前查找范围内的其他项。
     * @param filterByPartition 匹配所有相同partitionTime的项。
     * @param filterByAuthor 匹配所有相同author的项。
     * @param filterByTopic 匹配所有相同topic的项。
     * @param filterBySourcePart 匹配所有相同source id不同part的项。
     * @param filterBySourceBook 匹配所有相同source book的项。
     * @param filterBySourceRelation 匹配所有由source relation关联的项。
     * @param filterBySourceTagType 按照给出的sourceTagType，匹配所有拥有相同的这一类type的sourceTag的项。
     */
    data class TaskConfig(val findBySourceIdentity: Boolean,
                          val findBySourcePart: Boolean,
                          val findBySourceRelation: Boolean,
                          val findBySourceBook: Boolean,
                          val findBySimilarity: Boolean,
                          val filterInCurrentScope: Boolean,
                          val filterBySourcePart: Boolean,
                          val filterBySourceBook: Boolean,
                          val filterBySourceRelation: Boolean,
                          val filterByPartition: Boolean,
                          val filterByTopic: Boolean,
                          val filterByAuthor: Boolean,
                          val filterBySourceTagType: List<SourceAndTagType>)

    data class SourceAndTagType(val sourceSite: String, val tagType: String)
}

/**
 * 相似项查找的忽略标记。
 */
data class FindSimilarIgnored(val id: Int,
                              /**
                               * 此忽略标记的类型。
                               * EDGE：两个节点之间的忽略标记，此时使用两个节点；
                               * SOURCE_IDENTITY：忽略一个sourceId，节点填sourceDataId；
                               * SOURCE_BOOK：忽略一个sourceBook，节点填sourceBookId。
                               */
                              val type: IgnoredType,
                              /**
                               * 第一个节点。
                               */
                              val firstTarget: Int,
                              /**
                               * 第二个节点。
                               */
                              val secondTarget: Int?,
                              /**
                               * 此关系记录的时间。
                               */
                              val recordTime: Instant) {
    enum class IgnoredType {
        EDGE, SOURCE_IDENTITY_SIMILAR, SOURCE_BOOK
    }
}

/**
 * 一条相似项查找的记录，一条记录等同于一个连通分量。
 */
data class FindSimilarResult(val id: Int,
                             /**
                              * 此result的类型。
                              */
                             val category: SimilarityCategory,
                             /**
                              * 此result包含哪些类型的关系。
                              */
                             val summaryType: SummaryTypes,
                             /**
                              * 此result是否已完全resolved。
                              */
                             val resolved: Boolean,
                             /**
                              * 此result包含的所有image的id。
                              */
                             val imageIds: List<Int>,
                             /**
                              * 包含的所有节点关系。
                              */
                             val edges: List<RelationEdge>,
                             /**
                              * 包含的所有节点覆盖区域。
                              */
                             val coverages: List<RelationCoverage>,
                             /**
                              * 此记录创建的时间。
                              */
                             val recordTime: Instant) {
    enum class SimilarityCategory {
        /**
         * 这是一条特殊的记录，它仅包括完全确定的等价关系，如source identity equal。这有可能是另一个连通分量的子图。把它划分出来是为了方便地处理完全等价关系。
         */
        EQUIVALENCE,
        /**
         * 这是一条普通的记录，包含一个完整的连通分量。
         */
        GRAPH
    }

    open class SummaryTypes(value: Int) : Composition<SummaryTypes>(SummaryTypes::class, value) {
        /**
         * 等价关系，如source identity equal。
         */
        object EQUIVALENCE : SummaryTypes(0b1)
        /**
         * 关联关系，各种由source关联引起的联系。
         */
        object RELATED : SummaryTypes(0b10)
        /**
         * 相近关系，内容相似度高引起的联系。
         */
        object SIMILAR : SummaryTypes(0b100)

        object EMPTY : SummaryTypes(0b0)

        companion object {
            val baseElements by lazy { listOf(EQUIVALENCE, RELATED, SIMILAR) }
            val empty by lazy { EMPTY }
        }
    }

    data class RelationEdge(val a: Int, val b: Int, val types: List<RelationEdgeType>)

    @JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "type")
    @JsonSubTypes(value = [
        JsonSubTypes.Type(value = SourceIdentityEqual::class, name = "SOURCE_IDENTITY_EQUAL"),
        JsonSubTypes.Type(value = SourceRelated::class, name = "SOURCE_RELATED"),
        JsonSubTypes.Type(value = HighSimilarity::class, name = "HIGH_SIMILARITY"),
        JsonSubTypes.Type(value = Associated::class, name = "ASSOCIATED"),
        JsonSubTypes.Type(value = Ignored::class, name = "IGNORED"),
    ])
    sealed interface RelationEdgeType

    data class SourceIdentityEqual(val site: String, val sourceId: Long?, val sourcePart: Int?, val sourcePartName: String?) : RelationEdgeType

    data class HighSimilarity(val similarity: Double) : RelationEdgeType

    data object SourceRelated : RelationEdgeType

    data object Associated : RelationEdgeType

    data object Ignored : RelationEdgeType

    data class RelationCoverage(val imageIds: List<Int>, val info: RelationCoverageType, val ignored: Boolean)

    @JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "type")
    @JsonSubTypes(value = [
        JsonSubTypes.Type(value = SourceIdentitySimilarCoverage::class, name = "SOURCE_IDENTITY_SIMILAR"),
        JsonSubTypes.Type(value = SourceBookCoverage::class, name = "SOURCE_BOOK"),
        JsonSubTypes.Type(value = CollectionCoverage::class, name = "COLLECTION"),
        JsonSubTypes.Type(value = BookCoverage::class, name = "BOOK"),
    ])
    sealed interface RelationCoverageType

    data class SourceIdentitySimilarCoverage(val site: String, val sourceId: Long) : RelationCoverageType

    data class SourceBookCoverage(val site: String, val sourceBookCode: String) : RelationCoverageType

    data class CollectionCoverage(val collectionId: Int) : RelationCoverageType

    data class BookCoverage(val bookId: Int) : RelationCoverageType
}