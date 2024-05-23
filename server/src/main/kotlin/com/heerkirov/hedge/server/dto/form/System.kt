package com.heerkirov.hedge.server.dto.form

import com.fasterxml.jackson.annotation.JsonSubTypes
import com.fasterxml.jackson.annotation.JsonTypeInfo
import com.heerkirov.hedge.server.enums.NoteStatus
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.utils.types.Opt
import java.time.LocalDate

data class HistoryPushForm(val type: String, val id: Int)

data class FindSimilarTaskCreateForm(val selector: FindSimilarTask.TaskSelector, val config: FindSimilarTask.TaskConfig? = null)

data class FindSimilarResultResolveForm(val actions: List<Resolution>, val clear: Boolean) {
    @JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "type")
    @JsonSubTypes(value = [
        JsonSubTypes.Type(value = CloneImageResolution::class, name = "CLONE_IMAGE"),
        JsonSubTypes.Type(value = AddToCollectionResolution::class, name = "ADD_TO_COLLECTION"),
        JsonSubTypes.Type(value = AddToBookResolution::class, name = "ADD_TO_BOOK"),
        JsonSubTypes.Type(value = DeleteResolution::class, name = "DELETE"),
        JsonSubTypes.Type(value = MarkIgnoredResolution::class, name = "MARK_IGNORED"),
        JsonSubTypes.Type(value = MarkIgnoredSourceBookResolution::class, name = "MARK_IGNORED_SOURCE_BOOK"),
        JsonSubTypes.Type(value = MarkIgnoredSourceDataResolution::class, name = "MARK_IGNORED_SOURCE_DATA"),
    ])
    sealed interface Resolution

    sealed interface ResolutionForTwoImage : Resolution { val from: Int; val to: Int }

    sealed interface ResolutionForMultipleImage : Resolution { val imageIds: List<Int> }

    data class CloneImageResolution(override val from: Int, override val to: Int, val props: ImagePropsCloneForm.Props, val merge: Boolean = false, val deleteFrom: Boolean = false) : ResolutionForTwoImage

    data class AddToCollectionResolution(override val imageIds: List<Int>, val collectionId: Any, val specifyPartitionTime: LocalDate? = null) : ResolutionForMultipleImage

    data class AddToBookResolution(override val imageIds: List<Int>, val bookId: Int) : ResolutionForMultipleImage

    data class DeleteResolution(override val imageIds: List<Int>, val deleteCompletely: Boolean = false) : ResolutionForMultipleImage

    data class MarkIgnoredResolution(override val from: Int, override val to: Int) : ResolutionForTwoImage

    data class MarkIgnoredSourceBookResolution(val site: String, val sourceBookCode: String) : Resolution

    data class MarkIgnoredSourceDataResolution(val site: String, val sourceId: String) : Resolution
}

data class NoteCreateForm(val title: String, val content: String? = null, val status: NoteStatus? = null)

data class NoteUpdateForm(val title: Opt<String>, val content: Opt<String>, val status: Opt<NoteStatus>, val deleted: Opt<Boolean>)