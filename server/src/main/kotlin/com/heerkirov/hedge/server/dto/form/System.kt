package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.model.FindSimilarTask

data class HistoryPushForm(val type: String, val id: Int)

data class FindSimilarTaskCreateForm(val selector: FindSimilarTask.TaskSelector, val config: FindSimilarTask.TaskConfig? = null)

data class FindSimilarResultProcessForm(val target: List<Int>? = null, val action: Action) {
    enum class Action {
        DELETE,
        RETAIN_OLD,
        RETAIN_OLD_AND_CLONE_PROPS,
        RETAIN_NEW,
        RETAIN_NEW_AND_CLONE_PROPS,
    }
}