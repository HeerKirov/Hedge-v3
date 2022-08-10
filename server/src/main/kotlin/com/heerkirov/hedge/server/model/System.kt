package com.heerkirov.hedge.server.model

import com.fasterxml.jackson.annotation.JsonSubTypes
import com.fasterxml.jackson.annotation.JsonTypeInfo
import java.time.LocalDate
import java.time.LocalDateTime

data class HistoryRecord(/**
                          * 根据类型隔离的序列ID。
                          */
                         val sequenceId: Long,
                         /**
                          * 存储类型。
                          */
                         val type: SystemHistoryRecordType,
                         /**
                          * 目标标识。
                          */
                         val key: String,
                         /**
                          * 记录时间。
                          */
                         val recordTime: Long) {
    enum class SystemHistoryRecordType {
        META_EDITOR_TAG,
        META_EDITOR_TOPIC,
        META_EDITOR_AUTHOR,
        USED_FOLDER,
        USED_TOPIC,
        USED_ANNOTATION,
    }
}

/**
 * 系统导出任务的持久化记录项。
 */
data class ExporterRecord(val id: Int,
                          /**
                           * 任务类型。
                           */
                          val type: Int,
                          /**
                           * 任务唯一id。
                           */
                          val key: String,
                          /**
                           * 任务内容。
                           */
                          val content: String,
                          /**
                            * 此任务创建的时间。
                           */
                          val createTime: LocalDateTime)

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

    data class TaskSelectorOfSourceTag(val sourceSite: String, val sourceTags: List<String>) : TaskSelector

    data class TaskConfig(val findBySourceKey: Boolean,
                          val findBySimilarity: Boolean,
                          val findBySourceRelation: Boolean,
                          val findBySourceMark: Boolean,
                          val findBySimilarityThreshold: Double? = null,
                          val findBySourceRelationBasis: List<RelationBasis>? = null,
                          val filterByPartition: Boolean,
                          val filterByTopic: Boolean,
                          val filterByAuthor: Boolean,
                          val filterBySourceTagType: List<SourceAndTagType>)

    data class SourceAndTagType(val sourceSite: String, val tagType: String)

    enum class RelationBasis {
        RELATION, BOOK, PART
    }
}

data class FindSimilarResult(val id: Int,
                             /**
                              * 用于唯一标记一项result的字符串。是一个过渡方案，正式方案可能需要内存维护。
                              */
                             val key: String,
                             /**
                              * 此result的类型。
                              */
                             val type: Type,
                             /**
                              * 此待处理结果包含的所有image ids。用于id搜索。
                              */
                             val imageIds: List<Int>,
                             /**
                              * 用于排序的id。它是imageIds中最大的那一个。
                              */
                             val ordered: Int,
                             /**
                              * 此记录创建的时间。
                              */
                             val recordTime: LocalDateTime) {
    enum class Type {
        DUPLICATED,
        OTHERS
    }
}