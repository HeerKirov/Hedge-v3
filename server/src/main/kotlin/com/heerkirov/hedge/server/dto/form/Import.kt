package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.components.database.ImportOption
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.model.ImportImage
import com.heerkirov.hedge.server.utils.types.Opt
import java.io.InputStream
import java.time.LocalDate
import java.time.LocalDateTime

data class ImportForm(val filepath: String,
                      val mobileImport: Boolean = false)

data class UploadForm(val content: InputStream,
                      val filename: String,
                      val extension: String)

class ImportUpdateForm(val tagme: Opt<Illust.Tagme>,
                       val sourceSite: Opt<String?>,
                       val sourceId: Opt<Long?>,
                       val sourcePart: Opt<Int?>,
                       val preference: Opt<ImportImage.Preference>,
                       val collectionId: Opt<Any?>,
                       val folderIds: Opt<List<Int>>,
                       val bookIds: Opt<List<Int>>,
                       val partitionTime: Opt<LocalDate>,
                       val orderTime: Opt<LocalDateTime>,
                       val createTime: Opt<LocalDateTime>)

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
