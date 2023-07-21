package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.components.backend.watcher.PathWatcherError
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.model.ImportImage
import java.time.LocalDate
import java.time.LocalDateTime

data class ImportSaveRes(val total: Int, val errors: List<SaveErrorItem>) {
    data class SaveErrorItem(val importId: Int, val fileNotReady: Boolean, val notExistedCollectionId: Int?, val notExistedCloneImageId: Int?, val notExistedBookIds: List<Int>?, val notExistedFolderIds: List<Int>?)
}

data class ImportImageRes(val id: Int, val file: String, val thumbnailFile: String?,
                          val fileName: String?, val sourceSite: String?, val sourceId: Long?, val sourcePart: Int?,
                          val tagme: Illust.Tagme, val partitionTime: LocalDate, val orderTime: LocalDateTime)

data class ImportImageDetailRes(val id: Int,
                                val file: String, val thumbnailFile: String?,
                                val fileName: String?, val filePath: String?,
                                val fileCreateTime: LocalDateTime?, val fileUpdateTime: LocalDateTime?, val fileImportTime: LocalDateTime,
                                val extension: String, val size: Long, val resolutionWidth: Int, val resolutionHeight: Int,
                                val tagme: Illust.Tagme, val preference: ImportImage.Preference?,
                                val collectionId: Any?, val collection: IllustCollectionSimpleRes?, val folders: List<FolderSimpleRes>, val books: List<BookSimpleRes>,
                                val sourceSite: String?, val sourceId: Long?, val sourcePart: Int?, val sourcePreference: ImportImage.SourcePreference?,
                                val partitionTime: LocalDate, val orderTime: LocalDateTime, val createTime: LocalDateTime)

data class ImportWatcherRes(val isOpen: Boolean, val statisticCount: Int, val errors: List<PathWatcherError>)