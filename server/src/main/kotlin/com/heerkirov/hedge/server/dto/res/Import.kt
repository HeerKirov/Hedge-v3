package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.components.backend.watcher.PathWatcherError
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.model.ImportImage
import java.time.LocalDate
import java.time.Instant

data class ImportSaveRes(val total: Int, val errors: List<SaveErrorItem>) {
    data class SaveErrorItem(val importId: Int, val fileNotReady: Boolean, val notExistedCollectionId: Int?, val notExistedCloneImageId: Int?, val notExistedBookIds: List<Int>?, val notExistedFolderIds: List<Int>?)
}

data class ImportImageRes(val id: Int, val filePath: NullableFilePath, val originFileName: String?, val source: SourceDataPath?,
                          val tagme: Illust.Tagme, val partitionTime: LocalDate, val orderTime: Instant)

data class ImportImageDetailRes(val id: Int, val filePath: NullableFilePath,
                                val originFileName: String?, val originFilePath: String?,
                                val fileCreateTime: Instant?, val fileUpdateTime: Instant?, val fileImportTime: Instant,
                                val extension: String, val size: Long, val resolutionWidth: Int, val resolutionHeight: Int, val videoDuration: Long,
                                val tagme: Illust.Tagme, val preference: ImportImage.Preference?,
                                val collectionId: Any?, val collection: IllustCollectionSimpleRes?, val folders: List<FolderSimpleRes>, val books: List<BookSimpleRes>,
                                val source: SourceDataPath?, val sourcePreference: ImportImage.SourcePreference?,
                                val partitionTime: LocalDate, val orderTime: Instant, val createTime: Instant)

data class ImportWatcherRes(val isOpen: Boolean, val statisticCount: Int, val errors: List<PathWatcherError>)