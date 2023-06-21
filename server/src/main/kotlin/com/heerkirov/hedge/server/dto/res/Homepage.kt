package com.heerkirov.hedge.server.dto.res

import java.time.LocalDate

data class HomepageRes(val date: LocalDate,
                       val todayImages: List<IllustSimpleRes>,
                       val todayBooks: List<Book>,
                       val todayAuthorAndTopics: List<AuthorOrTopic>,
                       val recentImages: List<IllustSimpleRes>,
                       val historyImages: List<HistoryImage>) {
    data class AuthorOrTopic(val metaType: String, val type: String, val id: Int, val name: String, val color: String?, val images: List<IllustSimpleRes>)

    data class Book(val id: Int, val title: String, val imageCount: Int, val thumbnailFile: String?)

    data class HistoryImage(val date: LocalDate, val images: List<IllustSimpleRes>)
}