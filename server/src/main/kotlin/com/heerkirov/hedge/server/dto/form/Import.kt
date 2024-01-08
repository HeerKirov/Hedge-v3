package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.components.appdata.ImportOption
import com.heerkirov.hedge.server.dto.res.SourceDataPath
import java.io.InputStream

data class ImportForm(val filepath: String, val mobileImport: Boolean = false)

data class UploadForm(val content: InputStream, val filename: String, val extension: String)

data class ImportBatchForm(val target: List<Int>? = null,
                           val analyseSource: Boolean = false,
                           val analyseTime: Boolean = false,
                           val analyseTimeBy: ImportOption.TimeType? = null,
                           val retry: Boolean = false,
                           val retryAndAllowNoSource: Boolean = false,
                           val retryWithManualSource: SourceDataPath? = null,
                           val clearCompleted: Boolean = false,
                           val delete: Boolean = false,
                           val deleteDeleted: Boolean = false)

class ImportWatcherForm(val isOpen: Boolean)
