package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.dao.Illusts
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.enums.SourceEditStatus
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.utils.DateTime.parseDateTime
import com.heerkirov.hedge.server.utils.business.filePathFrom
import org.ktorm.dsl.QueryRowSet
import java.time.LocalDate
import java.time.LocalDateTime


data class IllustRes(val id: Int, val type: IllustType, val childrenCount: Int?, val filePath: FilePath,
                     val score: Int?, val favorite: Boolean, val tagme: Illust.Tagme,
                     val sourceSite: String?, val sourceId: Long?, val sourcePart: Int?,
                     val orderTime: LocalDateTime)

data class IllustSimpleRes(val id: Int, val filePath: FilePath)

data class IllustCollectionSimpleRes(val id: Int, val filePath: FilePath, val childrenCount: Int)

data class IllustDetailRes(val id: Int, val type: IllustType, val childrenCount: Int?, val filePath: FilePath,
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
                                    val tags: List<SourceTagDto>?, val books: List<SourceBookDto>?,
                                    val relations: List<Long>?, val links: List<String>?,
                                    val additionalInfo: List<SourceDataAdditionalInfoDto>?)

data class IllustParent(val id: Int, val filePath: FilePath, val childrenCount: Int)

data class PartitionRes(val date: LocalDate, val count: Int)

data class PartitionMonthRes(val year: Int, val month: Int, val dayCount: Int, val count: Int)

fun newIllustRes(it: QueryRowSet): IllustRes {
    val id = it[Illusts.id]!!
    val type = if(it[Illusts.type]!! == IllustModelType.COLLECTION) IllustType.COLLECTION else IllustType.IMAGE
    val score = it[Illusts.exportedScore]
    val favorite = it[Illusts.favorite]!!
    val tagme = it[Illusts.tagme]!!
    val orderTime = it[Illusts.orderTime]!!.parseDateTime()
    val childrenCount = it[Illusts.cachedChildrenCount]?.takeIf { type == IllustType.COLLECTION }
    val source = it[Illusts.sourceSite]
    val sourceId = it[Illusts.sourceId]
    val sourcePart = it[Illusts.sourcePart]
    val filePath = filePathFrom(it)
    return IllustRes(id, type, childrenCount, filePath, score, favorite, tagme, source, sourceId, sourcePart, orderTime)
}