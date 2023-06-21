package com.heerkirov.hedge.server.model

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
        USED_AUTHOR,
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

/**
 * app主页内容持久化记录表。
 */
data class HomepageRecord(val date: LocalDate, val content: Content) {
    data class Content(val todayImageIds: List<Int>,
                       val todayBookIds: List<Int>,
                       val todayAuthorAndTopicIds: List<AuthorOrTopic>,
                       val historyImages: List<HistoryImage>)

    data class AuthorOrTopic(val type: String, val id: Int)

    data class HistoryImage(val date: LocalDate, val imageIds: List<Int>)
}