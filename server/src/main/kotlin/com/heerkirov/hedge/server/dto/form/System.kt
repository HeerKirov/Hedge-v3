package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.utils.types.FindSimilarEntityKey

data class HistoryPushForm(val type: String, val id: Int)

data class FindSimilarTaskCreateForm(val selector: FindSimilarTask.TaskSelector, val config: FindSimilarTask.TaskConfig? = null)

data class FindSimilarResultResolveForm(val actions: List<Resolution>) {
    data class Resolution(val a: FindSimilarEntityKey, val b: FindSimilarEntityKey? = null, val actionType: ActionType, val config: Any? = null)

    enum class ActionType {
        CLONE_IMAGE,
        DELETE,
        ADD_TO_COLLECTION,
        ADD_TO_BOOK,
        MARK_IGNORED
    }

    data class CloneImageConfig(val props: ImagePropsCloneForm.Props, val merge: Boolean = false, val deleteFrom: Boolean = false)

    data class AddToCollectionConfig(val collectionId: Any)

    data class AddToBookConfig(val bookId: Int)
}