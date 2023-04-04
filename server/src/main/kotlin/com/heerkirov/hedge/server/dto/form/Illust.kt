package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.enums.SourceEditStatus
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.utils.types.Opt
import java.time.LocalDate
import java.time.LocalDateTime

data class IllustCollectionCreateForm(val images: List<Int>,
                                      val description: String? = null,
                                      val score: Int? = null,
                                      val favorite: Boolean = false,
                                      val tagme: Illust.Tagme = Illust.Tagme.EMPTY)

open class IllustCollectionUpdateForm(val topics: Opt<List<Int>>, val authors: Opt<List<Int>>, val tags: Opt<List<Int>>,
                                      val description: Opt<String?>, val score: Opt<Int?>, val favorite: Opt<Boolean>, val tagme: Opt<Illust.Tagme>
)

class IllustCollectionRelatedUpdateForm(val associates: Opt<List<Int>?>)

class IllustImageUpdateForm(topics: Opt<List<Int>>, authors: Opt<List<Int>>, tags: Opt<List<Int>>,
                            description: Opt<String?>, score: Opt<Int?>, favorite: Opt<Boolean>, tagme: Opt<Illust.Tagme>,
                            val partitionTime: Opt<LocalDate>, val orderTime: Opt<LocalDateTime>) : IllustCollectionUpdateForm(topics, authors, tags, description, score, favorite, tagme)

class IllustImageRelatedUpdateForm(val associates: Opt<List<Int>?>, val collectionId: Opt<Int?>)

class IllustImageSourceDataUpdateForm(val sourceSite: Opt<String?>, val sourceId: Opt<Long?>, val sourcePart: Opt<Int?>,
                                      val title: Opt<String?>, val description: Opt<String?>, val tags: Opt<List<SourceTagForm>>,
                                      val books: Opt<List<SourceBookForm>>, val relations: Opt<List<Long>>, val status: Opt<SourceEditStatus>)

class IllustBatchUpdateForm(val target: List<Int>,
                            val description: Opt<String?>,
                            val score: Opt<Int?>,
                            val favorite: Opt<Boolean>,
                            val tags: Opt<List<Int>>,
                            val topics: Opt<List<Int>>,
                            val authors: Opt<List<Int>>,
                            val tagme: Opt<Illust.Tagme>,
                            val partitionTime: Opt<LocalDate>,
                            val orderTimeBegin: Opt<LocalDateTime>,
                            val orderTimeEnd: Opt<LocalDateTime>)

class ImagePropsCloneForm(val props: Props, val merge: Boolean = false, val deleteFrom: Boolean = false, val from: Int, val to: Int) {
    data class Props(
        val score: Boolean = false,
        val favorite: Boolean = false,
        val description: Boolean = false,
        val tagme: Boolean = false,
        val metaTags: Boolean = false,
        val partitionTime: Boolean = false,
        val orderTime: Boolean = false,
        val collection: Boolean = false,
        val books: Boolean = false,
        val folders: Boolean = false,
        val associate: Boolean = false,
        val source: Boolean = false
    )
}
