package com.heerkirov.hedge.server.model

import com.heerkirov.hedge.server.enums.NoteStatus
import java.time.Instant
import java.time.LocalDate

data class HistoryRecord(/**
                          * 存储类型。
                          */
                         val type: HistoryType,
                         /**
                          * 隔离频道。
                          */
                         val channel: String,
                         /**
                          * 目标标识。
                          */
                         val key: String,
                         /**
                          * 记录时间。
                          */
                         val recordTime: Long) {
    enum class HistoryType {
        /**
         * 在metaTagEditor中使用过的(TAG, TOPIC, AUTHOR)。
         */
        META_EDITOR,
        /**
         * 在选取器中选取过的(FOLDER, TOPIC, AUTHOR)。
         */
        PICKER,
        /**
         * 在搜索框查询中使用过的查询语句(...dialect)。
         */
        QUERY
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
data class HomepageRecord(val date: LocalDate, val page: Int, val content: Content) {

    data class Content(val illusts: List<Int>, val extras: List<Int>, val partitions: List<LocalDate>, val extraType: String)
}

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