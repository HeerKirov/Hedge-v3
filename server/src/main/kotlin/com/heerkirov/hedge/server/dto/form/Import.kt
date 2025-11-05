package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.components.appdata.ImportOption
import com.heerkirov.hedge.server.dto.res.SourceDataPath
import java.io.InputStream
import java.time.Instant

data class ImportForm(val filepath: String, val mobileImport: Boolean = false)

data class UploadForm(val content: InputStream,
                      val filename: String,
                      val extension: String,
                      val modificationTime: Instant? = null,
                      val creationTime: Instant? = null)

data class ImportBatchForm(val target: List<Int>? = null,
                           val analyseSource: Boolean = false,
                           val analyseTime: Boolean = false,
                           val analyseTimeBy: ImportOption.TimeType? = null,
                           val retry: Boolean = false,
                           val retryAndAllowNoSource: Boolean = false,
                           val retryWithManualSource: SourceDataPath? = null,
                           val rename: String? = null,
                           val clearCompleted: Boolean = false,
                           val delete: Boolean = false,
                           val deleteDeleted: Boolean = false)
