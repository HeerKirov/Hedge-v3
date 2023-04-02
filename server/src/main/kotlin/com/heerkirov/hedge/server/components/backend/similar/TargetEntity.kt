package com.heerkirov.hedge.server.components.backend.similar

import com.heerkirov.hedge.server.model.SourceTag
import java.time.LocalDate

sealed interface TargetEntity

data class ImageEntity(val id: Int,
                       val partitionTime: LocalDate,
                       val sourceTags: List<SourceTag>,
                       val authors: List<Int>,
                       val topics: List<Int>) : TargetEntity

data class ImportImageEntity(val id: Int,
                             val partitionTime: LocalDate,
                             val sourceTags: List<SourceTag>) : TargetEntity