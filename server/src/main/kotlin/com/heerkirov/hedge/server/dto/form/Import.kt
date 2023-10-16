package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.components.appdata.ImportOption
import com.heerkirov.hedge.server.dto.res.SourceDataPath
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.model.ImportImage
import com.heerkirov.hedge.server.utils.types.Opt
import com.heerkirov.hedge.server.utils.types.undefined
import java.io.InputStream
import java.time.LocalDate
import java.time.Instant

data class ImportForm(val filepath: String,
                      val mobileImport: Boolean = false)

data class UploadForm(val content: InputStream,
                      val filename: String,
                      val extension: String)

class ImportUpdateForm(val tagme: Opt<Illust.Tagme> = undefined(),
                       val source: Opt<SourceDataPath?> = undefined(),
                       val preference: Opt<ImportImage.Preference?> = undefined(),
                       val sourcePreference: Opt<ImportImage.SourcePreference?> = undefined(),
                       val collectionId: Opt<Any?> = undefined(),
                       val folderIds: Opt<List<Int>> = undefined(),
                       val bookIds: Opt<List<Int>> = undefined(),
                       val appendFolderIds: Opt<List<Int>> = undefined(),
                       val appendBookIds: Opt<List<Int>> = undefined(),
                       val partitionTime: Opt<LocalDate> = undefined(),
                       val orderTime: Opt<Instant> = undefined(),
                       val createTime: Opt<Instant> = undefined())

class ImportBatchUpdateForm(val target: List<Int>? = null,
                            val tagme: Illust.Tagme? = null,
                            val setCreateTimeBy: ImportOption.TimeType? = null,
                            val setOrderTimeBy: ImportOption.TimeType? = null,
                            val orderTimeBegin: Instant? = null,
                            val orderTimeEnd: Instant? = null,
                            val orderTimeExclude: Boolean = false,
                            val partitionTime: LocalDate? = null,
                            val analyseSource: Boolean = false,
                            val collectionId: Any? = null,
                            val appendFolderIds: List<Int>? = null,
                            val appendBookIds: List<Int>? = null,
                            val action: Action? = null) {
    enum class Action {
        SET_PARTITION_TIME_TODAY,
        SET_PARTITION_TIME_EARLIEST,
        SET_PARTITION_TIME_LATEST,
        SET_ORDER_TIME_NOW,
        SET_ORDER_TIME_REVERSE,
        SET_ORDER_TIME_UNIFORMLY,
        SET_ORDER_TIME_BY_SOURCE_ID
    }
}

class ImportSaveForm(val target: List<Int>? = null)

class ImportWatcherForm(val isOpen: Boolean)
