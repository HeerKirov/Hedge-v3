package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.dao.Illusts
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.enums.SourceEditStatus
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.utils.business.filePathFrom
import com.heerkirov.hedge.server.utils.business.sourcePathOfNullable
import org.ktorm.dsl.QueryRowSet
import java.time.LocalDate
import java.time.Instant


data class IllustRes(val id: Int, val type: IllustType, val childrenCount: Int?, val filePath: FilePath,
                     val score: Int?, val favorite: Boolean, val tagme: Illust.Tagme,
                     val source: SourceDataPath?, val partitionTime: LocalDate, val orderTime: Instant)

data class IllustSimpleRes(val id: Int, val filePath: FilePath)

data class IllustDetailRes(val id: Int, val type: IllustType, val childrenCount: Int?, val filePath: FilePath,
                           val extension: String, val size: Long, val resolutionWidth: Int, val resolutionHeight: Int, val videoDuration: Long,
                           val topics: List<TopicSimpleRes>, val authors: List<AuthorSimpleRes>, val tags: List<TagSimpleRes>,
                           val description: String, val score: Int?, val favorite: Boolean, val tagme: Illust.Tagme,
                           val originDescription: String, val originScore: Int?, val source: SourceDataPath?,
                           val parent: IllustParent?, val children: List<IllustSimpleRes>?, val books: List<BookSimpleRes>, val folders: List<FolderSimpleRes>, val associateCount: Int,
                           val partitionTime: LocalDate, val orderTime: Instant,
                           val createTime: Instant, val updateTime: Instant)

data class IllustCollectionRelatedRes(val children: List<IllustSimpleRes>, val childrenCount: Int, val associates: List<IllustRes>, val books: List<BookSimpleRes>, val folders: List<FolderSimpleRes>)

data class IllustImageRelatedRes(val collection: IllustParent?,
                                 val books: List<BookSimpleRes>,
                                 val folders: List<FolderSimpleRes>,
                                 val associates: List<IllustRes>)

data class IllustImageSourceDataRes(val source: SourceDataPath?, val sourceSiteName: String?,
                                    val empty: Boolean, val status: SourceEditStatus,
                                    val title: String?, val description: String?,
                                    val tags: List<SourceTagDto>?, val books: List<SourceBookDto>?,
                                    val relations: List<String>?, val links: List<String>?,
                                    val additionalInfo: List<SourceDataAdditionalInfoDto>?,
                                    val publishTime: Instant?)

data class IllustSummaryRes(val illustIds: List<Int>,
                            val topics: List<TopicSimpleRes>, val authors: List<AuthorSimpleRes>, val tags: List<TagSimpleRes>,
                            val description: String, val favorite: Boolean, val tagme: Illust.Tagme,
                            val scoreMin: Int?, val scoreMax: Int?, val scoreAvg: Int?,
                            val orderTimeMin: Instant, val orderTimeMax: Instant)

data class IllustParent(val id: Int, val filePath: FilePath, val childrenCount: Int)

data class IllustLocationRes(val id: Int, val index: Int, val type: IllustType)

data class PartitionRes(val date: LocalDate, val count: Int)

fun newIllustRes(it: QueryRowSet): IllustRes {
    val id = it[Illusts.id]!!
    val type = if(it[Illusts.type]!! == IllustModelType.COLLECTION) IllustType.COLLECTION else IllustType.IMAGE
    val score = it[Illusts.exportedScore]
    val favorite = it[Illusts.favorite]!!
    val tagme = it[Illusts.tagme]!!
    val partitionTime = it[Illusts.partitionTime]!!
    val orderTime = Instant.ofEpochMilli(it[Illusts.orderTime]!!)
    val childrenCount = it[Illusts.cachedChildrenCount]?.takeIf { type == IllustType.COLLECTION }
    val source = sourcePathOfNullable(it[Illusts.sourceSite], it[Illusts.sourceId], it[Illusts.sourcePart], it[Illusts.sourcePartName])
    val filePath = filePathFrom(it)
    return IllustRes(id, type, childrenCount, filePath, score, favorite, tagme, source, partitionTime, orderTime)
}