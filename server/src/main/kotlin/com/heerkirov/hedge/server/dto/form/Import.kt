package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.components.database.ImportOption
import com.heerkirov.hedge.server.model.Illust
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
                       val partitionTime: Opt<LocalDate>,
                       val orderTime: Opt<LocalDateTime>,
                       val createTime: Opt<LocalDateTime>)

class ImportBatchUpdateForm(val target: List<Int>? = null,
                            val tagme: Illust.Tagme? = null,
                            val setCreateTimeBy: ImportOption.TimeType? = null,
                            val setOrderTimeBy: ImportOption.TimeType? = null,
                            val partitionTime: LocalDate? = null,
                            val analyseSource: Boolean = false)

class ImportActForm(val target: List<Int>? = null,
                    val action: ActAction,
                    val index: Int? = null)

class ImportSaveForm(val target: List<Int>? = null)

class ImportWatcherForm(val isOpen: Boolean)

enum class ActAction { ADD, REMOVE, REMOVE_ALL }