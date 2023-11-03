package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.enums.NoteStatus
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.utils.types.Opt

data class HistoryPushForm(val type: String, val id: Int)

data class FindSimilarTaskCreateForm(val selector: FindSimilarTask.TaskSelector, val config: FindSimilarTask.TaskConfig? = null)

data class FindSimilarResultResolveForm(val actions: List<Resolution>) {
    data class Resolution(val a: Int, val b: Int? = null, val actionType: ActionType, val config: Any? = null)

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

data class NoteCreateForm(val title: String, val content: String? = null, val status: NoteStatus? = null)

data class NoteUpdateForm(val title: Opt<String>, val content: Opt<String>, val status: Opt<NoteStatus>, val deleted: Opt<Boolean>)