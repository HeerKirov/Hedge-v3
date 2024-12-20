package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.components.backend.BackgroundTaskType
import java.time.LocalDate

data class HomepageRes(val date: LocalDate,
                       val page: Int,
                       val illusts: List<Illust>,
                       val extraType: String,
                       val extras: List<Extra>) {
    data class Extra(val id: Int,
                     val name: String?, val type: String?, val color: String?, val images: List<IllustSimpleRes>?,
                     val title: String?, val favorite: Boolean?, val imageCount: Int?, val filePath: FilePath?)

    data class Illust(val id: Int, val filePath: FilePath, val partitionTime: LocalDate)
}

data class HomepageStateRes(val today: LocalDate,
                            val importImageCount: Int,
                            val importImageErrorCount: Int,
                            val findSimilarCount: Int,
                            val stagingPostCount: Int)

data class BackgroundTaskRes(val type: BackgroundTaskType, val currentValue: Int, val maxValue: Int)
