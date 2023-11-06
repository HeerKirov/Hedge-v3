package com.heerkirov.hedge.server.model

import com.fasterxml.jackson.annotation.JsonSubTypes
import com.fasterxml.jackson.annotation.JsonTypeInfo
import com.heerkirov.hedge.server.dto.res.SourceTagPath
import com.heerkirov.hedge.server.enums.SimilarityType
import com.heerkirov.hedge.server.enums.SourceMarkType
import com.heerkirov.hedge.server.utils.composition.Composition
import java.time.Instant
import java.time.LocalDate

data class FindSimilarTask(val id: Int,
                           /**
                            * 此task的查询范围。
                            */
                           val selector: TaskSelector,
                           /**
                            * 此task的查询选项。是可选的。
                            */
                           val config: TaskConfig?,
                           /**
                            * 创建此单位的时间。
                            */
                           val recordTime: Instant
) {

    @JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "type")
    @JsonSubTypes(value = [
        JsonSubTypes.Type(value = TaskSelectorOfImages::class, name = "illust"),
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

data class FindSimilarIgnored(val id: Int,
                              /**
                               * 第一个节点。
                               */
                              val firstTarget: String,
                              /**
                               * 第二个节点。
                               */
                              val secondTarget: String,
                              /**
                               * 此关系记录的时间。
                               */
                              val recordTime: Instant)

data class FindSimilarResult(val id: Int,
                             /**
                              * 此result的主要内容类型。
                              */
                             val summaryTypes: SummaryTypes,
                             /**
                              * 此待处理结果包含的所有image。
                              */
                             val images: List<String>,
                             /**
                              * 包含的所有关系。
                              */
                             val relations: List<RelationUnit>,
                             /**
                              * 排序优先级。根据主要内容类型计算。
                              */
                             val sortPriority: Int,
                             /**
                              * 此记录创建的时间。
                              */
                             val recordTime: Instant) {
    open class SummaryTypes(value: Int) : Composition<SummaryTypes>(SummaryTypes::class, value) {
        object SAME : SummaryTypes(0b1)
        object RELATED : SummaryTypes(0b10)
        object SIMILAR : SummaryTypes(0b100)
        object EMPTY : SummaryTypes(0b0)

        companion object {
            val baseElements by lazy { listOf(SAME, RELATED, SIMILAR) }
            val empty by lazy { EMPTY }
        }
    }

    data class RelationUnit(val a: Int,
                            val b: Int,
                            val type: SimilarityType,
                            @JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "type")
                            val params: RelationInfo)

    @JsonSubTypes(value = [
        JsonSubTypes.Type(value = SourceIdentityRelationInfo::class, name = "SOURCE_IDENTITY"),
        JsonSubTypes.Type(value = SourceRelatedRelationInfo::class, name = "SOURCE_RELATED"),
        JsonSubTypes.Type(value = SourceMarkRelationInfo::class, name = "SOURCE_MARK"),
        JsonSubTypes.Type(value = SimilarityRelationInfo::class, name = "SIMILARITY"),
        JsonSubTypes.Type(value = ExistedRelationInfo::class, name = "EXISTED"),
    ])
    sealed interface RelationInfo

    data class SourceIdentityRelationInfo(val site: String, val sourceId: Long?, val sourcePart: Int?, val sourcePartName: String?) : RelationInfo

    data class SourceRelatedRelationInfo(val hasRelations: Boolean, val sameBooks: List<Int>) : RelationInfo

    data class SourceMarkRelationInfo(val markType: SourceMarkType) : RelationInfo

    data class SimilarityRelationInfo(val similarity: Double) : RelationInfo

    data class ExistedRelationInfo(val sameCollectionId: Int?, val samePreCollection: String?, val sameBooks: List<Int>, val sameAssociate: Boolean, val ignored: Boolean) : RelationInfo
}