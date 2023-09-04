package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.model.Illust
import java.time.LocalDate
import java.time.Instant

data class TrashedImageRes(val id: Int, val filePath: FilePath,
                           val score: Int?, val favorite: Boolean, val tagme: Illust.Tagme, val source: SourceDataPath?,
                           val orderTime: Instant, val trashedTime: Instant, val remainingTime: Long?)

data class TrashedImageDetailRes(val id: Int, val filePath: FilePath,
                                 val extension: String, val size: Long, val resolutionWidth: Int, val resolutionHeight: Int, val videoDuration: Long,
                                 val topics: List<TopicSimpleRes>, val authors: List<AuthorSimpleRes>, val tags: List<TagSimpleRes>,
                                 val collection: IllustParent?, val books: List<BookSimpleRes>, val folders: List<FolderSimpleRes>, val associates: List<IllustSimpleRes>,
                                 val description: String, val score: Int?, val favorite: Boolean, val tagme: Illust.Tagme, val source: SourceDataPath?,
                                 val partitionTime: LocalDate, val orderTime: Instant,
                                 val createTime: Instant, val updateTime: Instant,
                                 val trashedTime: Instant, val remainingTime: Long?)