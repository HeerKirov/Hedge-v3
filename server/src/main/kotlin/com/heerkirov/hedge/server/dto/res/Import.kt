package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.enums.ImportStatus
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.model.ImportRecord
import java.time.LocalDate
import java.time.Instant

data class ImportImageRes(val id: Int, val status: ImportStatus,
                          val filePath: NullableFilePath?, val illust: ImportIllust?,
                          val fileName: String?, val importTime: Instant) {
    data class ImportIllust(val id: Int,
                            val score: Int?, val favorite: Boolean, val tagme: Illust.Tagme,
                            val source: SourceDataPath?, val partitionTime: LocalDate, val orderTime: Instant)
}

data class ImportImageDetailRes(val id: Int, val status: ImportStatus, val statusInfo: ImportRecord.StatusInfo?,
                                val filePath: NullableFilePath?, val illust: ImportIllust?,
                                val fileName: String?, val fileCreateTime: Instant?, val fileUpdateTime: Instant?, val importTime: Instant) {
    data class ImportIllust(val id: Int,
                            val extension: String, val size: Long, val resolutionWidth: Int, val resolutionHeight: Int, val videoDuration: Long,
                            val topics: List<TopicSimpleRes>, val authors: List<AuthorSimpleRes>, val tags: List<TagSimpleRes>,
                            val description: String, val score: Int?, val favorite: Boolean, val tagme: Illust.Tagme,
                            val source: SourceDataPath?, val partitionTime: LocalDate, val orderTime: Instant)
}
