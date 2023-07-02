package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.enums.FolderType
import com.heerkirov.hedge.server.library.form.Min
import com.heerkirov.hedge.server.library.form.NotBlank
import com.heerkirov.hedge.server.utils.types.Opt


data class FolderCreateForm(@NotBlank val title: String,
                            val type: FolderType,
                            val parentId: Int? = null,
                            @Min(0) val ordinal: Int? = null,
                            val images: List<Int>? = null)

data class FolderUpdateForm(@NotBlank val title: Opt<String>,
                            val parentId: Opt<Int?>,
                            @Min(0) val ordinal: Opt<Int>
)

data class FolderImagesPartialUpdateForm(val action: BatchAction,
                                         /** 添加新的images/移动或删除images，指定其id */
                                         val images: List<Int>? = null,
                                         /** 添加或移动项到这个位置 */
                                         val ordinal: Int? = null)

data class FolderPinForm(val ordinal: Int? = null)

data class StagingPostUpdateForm(val action: Action,
                                 /** 添加新的images/移动或删除images，指定其id */
                                 val images: List<Int>? = null,
                                 /** 添加或移动项到这个位置 */
                                 val ordinal: Int? = null) {
    enum class Action {
        ADD, MOVE, DELETE, CLEAR
    }
}