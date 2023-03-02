package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.components.backend.watcher.PathWatcherError
import com.heerkirov.hedge.server.model.Illust
import java.time.LocalDate
import java.time.LocalDateTime

data class ImportSaveRes(val total: Int)

data class ImportImageRes(val id: Int, val file: String, val thumbnailFile: String?,
                          val fileName: String?, val sourceSite: String?, val sourceId: Long?, val sourcePart: Int?,
                          val tagme: Illust.Tagme, val partitionTime: LocalDate, val orderTime: LocalDateTime)

data class ImportImageDetailRes(val id: Int,
                                val file: String, val thumbnailFile: String?,
                                val fileName: String?, val filePath: String?,
                                val fileCreateTime: LocalDateTime?, val fileUpdateTime: LocalDateTime?, val fileImportTime: LocalDateTime,
                                val tagme: Illust.Tagme,
                                val sourceSite: String?, val sourceId: Long?, val sourcePart: Int?,
                                val partitionTime: LocalDate, val orderTime: LocalDateTime, val createTime: LocalDateTime)

data class ImportWatcherRes(val isOpen: Boolean, val statisticCount: Int, val errors: List<PathWatcherError>)