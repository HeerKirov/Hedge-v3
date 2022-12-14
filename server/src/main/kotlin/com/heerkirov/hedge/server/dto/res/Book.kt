package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.model.Illust
import java.time.LocalDateTime

data class BookRes(val id: Int, val title: String, val imageCount: Int,
                   val file: String?, val thumbnailFile: String?,
                   val score: Int?, val favorite: Boolean,
                   val createTime: LocalDateTime, val updateTime: LocalDateTime)

data class BookSimpleRes(val id: Int, val title: String)

data class BookDetailRes(val id: Int, val title: String, val imageCount: Int, val file: String?, val thumbnailFile: String?,
                         val topics: List<TopicSimpleRes>, val authors: List<AuthorSimpleRes>, val tags: List<TagSimpleRes>,
                         val description: String, val score: Int?, val favorite: Boolean,
                         val createTime: LocalDateTime, val updateTime: LocalDateTime)

data class BookImageRes(val id: Int, val ordinal: Int, val file: String, val thumbnailFile: String,
                        val score: Int?, val favorite: Boolean, val tagme: Illust.Tagme,
                        val sourceSite: String?, val sourceId: Long?, val sourcePart: Int?,
                        val orderTime: LocalDateTime)
