package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.model.Illust
import java.time.Instant

data class BookRes(val id: Int, val title: String, val imageCount: Int, val filePath: FilePath?,
                   val score: Int?, val favorite: Boolean,
                   val createTime: Instant, val updateTime: Instant)

data class BookSimpleRes(val id: Int, val title: String)

data class BookDetailRes(val id: Int, val title: String, val imageCount: Int, val filePath: FilePath?,
                         val topics: List<TopicSimpleRes>, val authors: List<AuthorSimpleRes>, val tags: List<TagSimpleRes>,
                         val description: String, val score: Int?, val favorite: Boolean,
                         val createTime: Instant, val updateTime: Instant)

data class BookImageRes(val id: Int, val ordinal: Int, val filePath: FilePath,
                        val score: Int?, val favorite: Boolean, val tagme: Illust.Tagme,
                        val source: SourceDataPath?, val orderTime: Instant)
