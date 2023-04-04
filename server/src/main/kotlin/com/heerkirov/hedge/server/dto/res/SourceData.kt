package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.enums.SourceEditStatus
import java.time.LocalDateTime

data class SourceDataRes(val sourceSite: String, val sourceSiteName: String, val sourceId: Long,
                         val tagCount: Int, val bookCount: Int, val relationCount: Int,
                         val empty: Boolean, val status: SourceEditStatus,
                         val createTime: LocalDateTime, val updateTime: LocalDateTime)

data class SourceDataDetailRes(val sourceSite: String, val sourceSiteName: String, val sourceId: Long,
                               val title: String, val description: String,
                               val empty: Boolean, val status: SourceEditStatus,
                               val tags: List<SourceTagDto>, val books: List<SourceBookDto>, val relations: List<Long>,
                               val createTime: LocalDateTime, val updateTime: LocalDateTime)

data class SourceTagDto(val code: String, val name: String, val otherName: String?, val type: String?)

data class SourceBookDto(val code: String, val title: String)
