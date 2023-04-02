package com.heerkirov.hedge.server.model

import com.fasterxml.jackson.annotation.JsonSubTypes
import com.fasterxml.jackson.annotation.JsonTypeInfo
import com.heerkirov.hedge.server.enums.SimilarityType
import com.heerkirov.hedge.server.utils.composition.Composition
import java.time.LocalDate
import java.time.LocalDateTime

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
                           val recordTime: LocalDateTime) {

    @JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "type")
    @JsonSubTypes(value = [
        JsonSubTypes.Type(value = TaskSelectorOfImage::class, name = "image"),
        JsonSubTypes.Type(value = TaskSelectorOfImportImage::class, name = "importImage"),
        JsonSubTypes.Type(value = TaskSelectorOfPartition::class, name = "partitionTime"),
        JsonSubTypes.Type(value = TaskSelectorOfTopic::class, name = "topic"),
        JsonSubTypes.Type(value = TaskSelectorOfAuthor::class, name = "author"),
        JsonSubTypes.Type(value = TaskSelectorOfSourceTag::class, name = "sourceTag"),
    ])
    sealed interface TaskSelector

    data class TaskSelectorOfImage(val imageIds: List<Int>) : TaskSelector

    data class TaskSelectorOfImportImage(val importIds: List<Int>) : TaskSelector

    data class TaskSelectorOfPartition(val partitionTime: LocalDate) : TaskSelector

    data class TaskSelectorOfTopic(val topicIds: List<Int>) : TaskSelector

    data class TaskSelectorOfAuthor(val authorIds: List<Int>) : TaskSelector

    data class TaskSelectorOfSourceTag(val sourceSite: String, val sourceTags: List<String>) : TaskSelector

    data class TaskConfig(val findBySourceIdentity: Boolean,
                          val findBySourceRelation: Boolean,
                          val findBySourceMark: Boolean,
                          val findBySimilarity: Boolean,
                          val similarityThreshold: Double? = null,
                          val similarityTooHighThreshold: Double? = null,
                          val filterByOtherImport: Boolean,
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
                              val recordTime: LocalDateTime)

data class FindSimilarResult(val id: Int,
                             /**
                              * 此result的主要内容类型。
                              */
                             val summaryTypes: SummaryTypes,
                             /**
                              * 此待处理结果包含的所有image。
                              */
                             val images: List<ImageUnit>,
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
                             val recordTime: LocalDateTime) {
    open class SummaryTypes(value: Int) : Composition<SummaryTypes>(SummaryTypes::class, value) {
        object SAME : SummaryTypes(0b1)
        object RELATED : SummaryTypes(0b01)
        object SIMILAR : SummaryTypes(0b001)
        object EMPTY : SummaryTypes(0b0)

        companion object {
            val baseElements by lazy { listOf(SAME, RELATED, SIMILAR) }
            val empty by lazy { EMPTY }
        }
    }

    enum class ImageUnitType { IMAGE, IMPORT_IMAGE }

    data class ImageUnit(val type: ImageUnitType, val id: Int)

    data class RelationUnit(val first: ImageUnit, val second: ImageUnit, val type: SimilarityType, val params: RelationTypeParams)

    sealed interface RelationTypeParams

    object EmptyParam : RelationTypeParams

    data class SourceIdentityParams(val site: String, val sourceId: Long, val sourcePart: Int?) : RelationTypeParams

    data class SourceRelatedParams(val hasRelations: Boolean, val sameBooks: List<Int>) : RelationTypeParams

    data class SimilarityParams(val similarity: Double) : RelationTypeParams

    data class ExistedParams(val sameCollectionId: Int?, val sameBooks: List<Int>, val sameAssociate: Boolean) : RelationTypeParams
}