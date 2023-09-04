package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.enums.SourceEditStatus
import com.heerkirov.hedge.server.enums.SourceMarkType
import java.time.Instant

data class SourceDataRes(val sourceSite: String, val sourceSiteName: String, val sourceId: Long,
                         val tagCount: Int, val bookCount: Int, val relationCount: Int,
                         val empty: Boolean, val status: SourceEditStatus,
                         val createTime: Instant, val updateTime: Instant)

data class SourceDataDetailRes(val sourceSite: String, val sourceSiteName: String, val sourceId: Long,
                               val title: String, val description: String,
                               val empty: Boolean, val status: SourceEditStatus,
                               val tags: List<SourceTagDto>, val books: List<SourceBookDto>,
                               val relations: List<Long>, val links: List<String>, val additionalInfo: List<SourceDataAdditionalInfoDto>,
                               val createTime: Instant, val updateTime: Instant)

data class SourceDataCollectStatus(val source: SourceDataPath,
                                   val imageCount: Int,
                                   val collected: Boolean,
                                   val collectStatus: SourceEditStatus?,
                                   val collectTime: Instant?)

data class SourceDataAdditionalInfoDto(val field: String, val label: String, val value: String)

data class SourceTagDto(val code: String, val name: String, val otherName: String?, val type: String?)

data class SourceBookDto(val code: String, val title: String, val otherTitle: String?)

data class SourceMarkRes(val sourceSite: String, val sourceSiteName: String, val sourceId: Long, val markType: SourceMarkType)

data class SourceDataIdentity(val sourceSite: String, val sourceId: Long)