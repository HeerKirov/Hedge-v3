package com.heerkirov.hedge.server.model

import com.heerkirov.hedge.server.enums.ArchiveType
import com.heerkirov.hedge.server.enums.NoteStatus
import java.time.Instant
import java.time.LocalDate

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
                          val createTime: Instant)

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

/**
 * 文件缓存访问记录。
 */
data class FileCacheRecord(val fileId: Int,
                           val archiveType: ArchiveType,
                           val block: String,
                           val filename: String,
                           val lastAccessTime: Instant)

/**
 * 便签功能的记录表。
 */
data class NoteRecord(val id: Int,
                      /**
                       * 标题。
                        */
                      val title: String,
                      /**
                       * 内容。
                       */
                      val content: String,
                      /**
                       * 状态，可选值为已固定、待办、已完成。
                       */
                      val status: NoteStatus,
                      /**
                       * 删除标记。
                       */
                      val deleted: Boolean,
                      /**
                       * 创建时间。
                       */
                      val createTime: Instant,
                      /**
                       * 上次修改时间。
                       */
                      val updateTime: Instant)