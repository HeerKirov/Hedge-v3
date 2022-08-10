package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.utils.types.Opt

data class BookCreateForm(val title: String? = null,
                          val description: String? = null,
                          val images: List<Int> = emptyList(),
                          val score: Int? = null,
                          val favorite: Boolean = false)

data class BookUpdateForm(val title: Opt<String?>,
                          val description: Opt<String?>,
                          val score: Opt<Int?>,
                          val favorite: Opt<Boolean>,
                          val topics: Opt<List<Int>>,
                          val authors: Opt<List<Int>>,
                          val tags: Opt<List<Int>>)

data class BookImagesPartialUpdateForm(val action: BatchAction,
                                       /** 添加新的images/移动或删除images，指定其id */
                                        val images: List<Int>? = null,
                                       /** 添加或移动项到这个位置 */
                                        val ordinal: Int? = null)

enum class BatchAction {
    ADD, MOVE, DELETE
}