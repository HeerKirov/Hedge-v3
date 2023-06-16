package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.model.Illust
import java.time.LocalDate
import java.time.LocalDateTime

data class TrashedImageRes(val id: Int, val file: String, val thumbnailFile: String,
                           val score: Int?, val favorite: Boolean, val tagme: Illust.Tagme,
                           val sourceSite: String?, val sourceId: Long?, val sourcePart: Int?,
                           val orderTime: LocalDateTime, val trashedTime: LocalDateTime)

data class TrashedImageDetailRes(val id: Int, val file: String, val thumbnailFile: String,
                                 val extension: String, val size: Long, val resolutionWidth: Int, val resolutionHeight: Int,
                                 val topics: List<TopicSimpleRes>, val authors: List<AuthorSimpleRes>, val tags: List<TagSimpleRes>,
                                 val collection: IllustParent?, val books: List<BookSimpleRes>, val folders: List<FolderSimpleRes>, val associates: List<IllustSimpleRes>,
                                 val description: String, val score: Int?, val favorite: Boolean, val tagme: Illust.Tagme,
                                 val sourceSite: String?, val sourceId: Long?, val sourcePart: Int?,
                                 val partitionTime: LocalDate, val orderTime: LocalDateTime,
                                 val createTime: LocalDateTime, val updateTime: LocalDateTime, val trashedTime: LocalDateTime)