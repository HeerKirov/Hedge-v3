package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.components.backend.BackgroundTaskType
import java.time.LocalDate

data class HomepageRes(val ready: Boolean,
                       val date: LocalDate,
                       val todayImages: List<Illust>,
                       val todayBooks: List<Book>,
                       val todayAuthorAndTopics: List<AuthorOrTopic>,
                       val recentImages: List<Illust>,
                       val historyImages: List<HistoryImage>) {
    data class AuthorOrTopic(val metaType: String, val type: String, val id: Int, val name: String, val color: String?, val images: List<IllustSimpleRes>)

    data class Book(val id: Int, val title: String, val favorite: Boolean, val imageCount: Int, val filePath: FilePath?)

    data class Illust(val id: Int, val filePath: FilePath, val partitionTime: LocalDate)

    data class HistoryImage(val date: LocalDate, val images: List<IllustSimpleRes>)
}

data class HomepageStateRes(val today: LocalDate,
                            val importImageCount: Int,
                            val importImageErrorCount: Int,
                            val findSimilarCount: Int,
                            val stagingPostCount: Int)

data class BackgroundTaskRes(val type: BackgroundTaskType, val currentValue: Int, val maxValue: Int)
