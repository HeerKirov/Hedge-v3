package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.components.database.ImportOption
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.model.ImportImage
import com.heerkirov.hedge.server.utils.types.Opt
import com.heerkirov.hedge.server.utils.types.undefined
import java.io.InputStream
import java.time.LocalDate
import java.time.LocalDateTime

data class ImportForm(val filepath: String,
                      val mobileImport: Boolean = false)

data class UploadForm(val content: InputStream,
                      val filename: String,
                      val extension: String)

class ImportUpdateForm(val tagme: Opt<Illust.Tagme> = undefined(),
                       val sourceSite: Opt<String?> = undefined(),
                       val sourceId: Opt<Long?> = undefined(),
                       val sourcePart: Opt<Int?> = undefined(),
                       val preference: Opt<ImportImage.Preference> = undefined(),
                       val collectionId: Opt<Any?> = undefined(),
                       val folderIds: Opt<List<Int>> = undefined(),
                       val bookIds: Opt<List<Int>> = undefined(),
                       val appendFolderIds: Opt<List<Int>> = undefined(),
                       val appendBookIds: Opt<List<Int>> = undefined(),
                       val partitionTime: Opt<LocalDate> = undefined(),
                       val orderTime: Opt<LocalDateTime> = undefined(),
                       val createTime: Opt<LocalDateTime> = undefined())

class ImportBatchUpdateForm(val target: List<Int>? = null,
                            val tagme: Illust.Tagme? = null,
                            val setCreateTimeBy: ImportOption.TimeType? = null,
                            val setOrderTimeBy: ImportOption.TimeType? = null,
                            val partitionTime: LocalDate? = null,
                            val analyseSource: Boolean = false,
                            val collectionId: Any? = null,
                            val appendFolderIds: List<Int>? = null,
                            val appendBookIds: List<Int>? = null)

class ImportSaveForm(val target: List<Int>? = null)

class ImportWatcherForm(val isOpen: Boolean)
