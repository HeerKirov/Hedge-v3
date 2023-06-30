package com.heerkirov.hedge.server.dto.res

import java.time.LocalDate

data class HomepageRes(val date: LocalDate,
                       val todayImages: List<Illust>,
                       val todayBooks: List<Book>,
                       val todayAuthorAndTopics: List<AuthorOrTopic>,
                       val recentImages: List<Illust>,
                       val historyImages: List<HistoryImage>) {
    data class AuthorOrTopic(val metaType: String, val type: String, val id: Int, val name: String, val color: String?, val images: List<IllustSimpleRes>)

    data class Book(val id: Int, val title: String, val imageCount: Int, val thumbnailFile: String?)

    data class Illust(val id: Int, val thumbnailFile: String, val partitionTime: LocalDate)

    data class HistoryImage(val date: LocalDate, val images: List<IllustSimpleRes>)
}

data class HomepageStateRes(val importImageCount: Int,
                            val findSimilarCount: Int)