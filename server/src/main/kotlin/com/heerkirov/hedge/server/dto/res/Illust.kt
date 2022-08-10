package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.enums.SourceEditStatus
import com.heerkirov.hedge.server.model.Illust
import java.time.LocalDate
import java.time.LocalDateTime


data class IllustRes(val id: Int, val type: IllustType, val childrenCount: Int?,
                     val file: String, val thumbnailFile: String,
                     val score: Int?, val favorite: Boolean, val tagme: Illust.Tagme,
                     val sourceSite: String?, val sourceId: Long?, val sourcePart: Int?,
                     val orderTime: LocalDateTime)

data class IllustSimpleRes(val id: Int, val thumbnailFile: String)

data class IllustDetailRes(val id: Int, val type: IllustType, val childrenCount: Int?,
                           val file: String, val thumbnailFile: String,
                           val extension: String, val size: Long, val resolutionWidth: Int, val resolutionHeight: Int,
                           val topics: List<TopicSimpleRes>, val authors: List<AuthorSimpleRes>, val tags: List<TagSimpleRes>,
                           val description: String, val score: Int?, val favorite: Boolean, val tagme: Illust.Tagme,
                           val originDescription: String, val originScore: Int?,
                           val sourceSite: String?, val sourceId: Long?, val sourcePart: Int?,
                           val partitionTime: LocalDate, val orderTime: LocalDateTime,
                           val createTime: LocalDateTime, val updateTime: LocalDateTime)

data class IllustCollectionRelatedRes(val associates: List<IllustRes>)

data class IllustImageRelatedRes(val collection: IllustParent?,
                                 val books: List<BookSimpleRes>,
                                 val folders: List<FolderSimpleRes>,
                                 val associates: List<IllustRes>)

data class IllustImageSourceDataRes(val sourceSite: String?, val sourceSiteName: String?,
                                    val sourceId: Long?, val sourcePart: Int?,
                                    val empty: Boolean, val status: SourceEditStatus,
                                    val title: String?, val description: String?,
                                    val tags: List<SourceTagDto>?, val books: List<SourceBookDto>?, val relations: List<Int>?)

data class IllustParent(val id: Int, val thumbnailFile: String, val childrenCount: Int)

data class PartitionRes(val date: LocalDate, val count: Int)

data class PartitionMonthRes(val year: Int, val month: Int, val dayCount: Int, val count: Int)