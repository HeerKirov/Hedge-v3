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
        JsonSubTypes.Type(value = TaskSelectorOfImage::class, name = "image"),
        JsonSubTypes.Type(value = TaskSelectorOfPartition::class, name = "partitionTime"),
        JsonSubTypes.Type(value = TaskSelectorOfTopic::class, name = "topic"),
        JsonSubTypes.Type(value = TaskSelectorOfAuthor::class, name = "author"),
        JsonSubTypes.Type(value = TaskSelectorOfSourceTag::class, name = "sourceTag"),
    ])
    sealed interface TaskSelector

    data class TaskSelectorOfImage(val imageIds: List<Int>) : TaskSelector

    data class TaskSelectorOfPartition(val partitionTime: LocalDate) : TaskSelector

    data class TaskSelectorOfTopic(val topicIds: List<Int>) : TaskSelector

    data class TaskSelectorOfAuthor(val authorIds: List<Int>) : TaskSelector

    data class TaskSelectorOfSourceTag(val sourceTags: List<SourceTagPath>) : TaskSelector

    /**
     * @param findBySourceIdentity 根据source identity是否相等做判定。
     * @param findBySourceRelation 根据source relation是否有关、source book是否同属一个做判定。
     * @param findBySourceMark 根据source mark的标记做判定。
     * @param findBySimilarity 根据相似度做判定。
     * @param filterByPartition 将所有相同partitionTime的项加入匹配检测。
     * @param filterByAuthor 将所有拥有相同author的项加入匹配检测。
     * @param filterByTopic 将所有拥有相同topic的项加入匹配检测。
     * @param filterBySourceTagType 按照给出的sourceTagType，将所有拥有相同的这一类type的sourceTag的项加入匹配检测。
     */
    data class TaskConfig(val findBySourceIdentity: Boolean,
                          val findBySourceRelation: Boolean,
                          val findBySourceMark: Boolean,
                          val findBySimilarity: Boolean,
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