package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.dto.res.SourceDataPath
import com.heerkirov.hedge.server.dto.res.SourceTagPath
import com.heerkirov.hedge.server.enums.SourceEditStatus
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.utils.types.Opt
import com.heerkirov.hedge.server.utils.types.undefined
import java.time.Instant
import java.time.LocalDate

data class IllustImageCreateForm(val importId: Int,
                                 val fileId: Int,
                                 val partitionTime: LocalDate?,
                                 val orderTime: Instant,
                                 val createTime: Instant,
                                 val source: SourceDataPath? = null,
                                 val description: String? = null,
                                 val score: Int? = null,
                                 val favorite: Boolean = false,
                                 val tagme: Illust.Tagme = Illust.Tagme.EMPTY,
                                 val tags: List<Int>? = null,
                                 val topics: List<Int>? = null,
                                 val authors: List<Int>? = null)

data class IllustCollectionCreateForm(val images: List<Int>,
                                      val description: String? = null,
                                      val score: Int? = null,
                                      val favorite: Boolean? = null,
                                      val tagme: Illust.Tagme? = null,
                                      val specifyPartitionTime: LocalDate? = null)

open class IllustUpdateForm(val topics: Opt<List<Int>>, val authors: Opt<List<Int>>, val tags: Opt<List<Int>>,
                            val description: Opt<String?>, val score: Opt<Int?>,
                            val favorite: Opt<Boolean>, val tagme: Opt<Illust.Tagme>,
                            val partitionTime: Opt<LocalDate>, val orderTime: Opt<Instant>)

class IllustCollectionRelatedUpdateForm(val associates: Opt<List<Int>?>)

class IllustCollectionImagesUpdateForm(val illustIds: List<Int>, val specifyPartitionTime: LocalDate? = null)

class IllustCollectionImagesPartialUpdateForm(val illustIds: List<Int>, val action: BatchAction, val specifyPartitionTime: LocalDate? = null, val ordinal: Int? = null)

class IllustImageRelatedUpdateForm(val associates: Opt<List<Int>?>, val collectionId: Opt<Int?>)

class IllustImageSourceDataUpdateForm(val source: Opt<SourceDataPath?>,
                                      val title: Opt<String?>, val description: Opt<String?>, val tags: Opt<List<SourceTagForm>>,
                                      val books: Opt<List<SourceBookForm>>, val relations: Opt<List<String>>,
                                      val links: Opt<List<String>>, val additionalInfo: Opt<List<SourceDataAdditionalInfoForm>>,
                                      val publishTime: Opt<Instant?>, val status: Opt<SourceEditStatus>)

class IllustBatchUpdateForm(val target: List<Int>,
                            val description: Opt<String?> = undefined(),
                            val score: Opt<Int?> = undefined(),
                            val favorite: Opt<Boolean> = undefined(),
                            val tags: Opt<List<Int>> = undefined(),
                            val topics: Opt<List<Int>> = undefined(),
                            val authors: Opt<List<Int>> = undefined(),
                            val mappingSourceTags: Opt<List<SourceTagPath>> = undefined(),
                            val tagUpdateMode: TagUpdateMode = TagUpdateMode.APPEND,
                            val tagme: Opt<Illust.Tagme> = undefined(),
                            val tagmePatch: Opt<List<TagmePatchUnit>> = undefined(),
                            val timeInsertBegin: Opt<Int> = undefined(),
                            val timeInsertEnd: Opt<Int> = undefined(),
                            val timeInsertAt: String? = null,
                            val partitionTime: Opt<LocalDate> = undefined(),
                            val orderTimeBegin: Opt<Instant> = undefined(),
                            val orderTimeEnd: Opt<Instant> = undefined(),
                            val orderTimeList: Opt<List<Instant>> = undefined(),
                            val orderTimeExclude: Boolean = false,
                            val action: Action? = null,
                            val actionBy: Int? = null) {
    enum class Action {
        SET_PARTITION_TIME_MOST,
        SET_PARTITION_TIME_TODAY,
        SET_PARTITION_TIME_EARLIEST,
        SET_PARTITION_TIME_LATEST,
        SET_ORDER_TIME_MOST,
        SET_ORDER_TIME_NOW,
        SET_ORDER_TIME_REVERSE,
        SET_ORDER_TIME_UNIFORMLY,
        SET_ORDER_TIME_BY_SOURCE_ID,
        SET_ORDER_TIME_BY_FILENAME,
        SET_ORDER_TIME_BY_BOOK_ORDINAL,
        SET_ORDER_TIME_BY_FOLDER_ORDINAL,
    }

    //tips: 当value为泛型参数时，想从kType中提取真实类型有点困难，为了避免这一步就不使用泛型了
    data class TagmePatchUnit(val plusOrMinus: Boolean, val value: Illust.Tagme)

    enum class TagUpdateMode {
        APPEND, OVERRIDE, REMOVE
    }
}

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

data class IllustSummaryForm(val illustIds: List<Int>, val unfold: Boolean = false)