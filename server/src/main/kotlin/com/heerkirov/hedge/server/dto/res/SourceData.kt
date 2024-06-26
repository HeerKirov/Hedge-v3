package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.enums.SourceEditStatus
import java.time.Instant

data class SourceDataRes(val sourceSite: String, val sourceSiteName: String, val sourceId: String,
                         val tagCount: Int, val bookCount: Int, val relationCount: Int,
                         val empty: Boolean, val status: SourceEditStatus,
                         val publishTime: Instant?, val createTime: Instant, val updateTime: Instant)

data class SourceDataDetailRes(val sourceSite: String, val sourceSiteName: String, val sourceId: String,
                               val title: String, val description: String,
                               val empty: Boolean, val status: SourceEditStatus,
                               val tags: List<SourceTagDto>, val books: List<SourceBookDto>,
                               val relations: List<String>, val links: List<String>, val additionalInfo: List<SourceDataAdditionalInfoDto>,
                               val publishTime: Instant?, val createTime: Instant, val updateTime: Instant)

data class SourceDataCollectStatus(val source: SourceDataPath,
                                   val imageCount: Int,
                                   val imageInDiffIdCount: Int,
                                   val collected: Boolean,
                                   val collectStatus: SourceEditStatus?,
                                   val collectTime: Instant?)

data class SourceDataAnalyseResult(val filename: String, val source: SourceDataPath?, val imageId: Int?, val error: String?)

data class SourceDataAdditionalInfoDto(val field: String, val label: String, val value: String)

data class SourceTagDto(val code: String, val type: String, val name: String, val otherName: String?)

data class SourceBookDto(val code: String, val title: String, val otherTitle: String?)

data class SourceDataIdentity(val sourceSite: String, val sourceId: String)