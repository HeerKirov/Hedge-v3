package com.heerkirov.hedge.server.dto.form

import java.io.InputStream

data class ImportForm(val filepath: String, val mobileImport: Boolean = false)

data class UploadForm(val content: InputStream, val filename: String, val extension: String)

data class ImportBatchForm(val target: List<Int>? = null,
                           val analyseSource: Boolean = false,
                           val analyseTime: Boolean = false,
                           val retry: Boolean = false,
                           val clearCompleted: Boolean = false,
                           val delete: Boolean = false,
                           val deleteDeleted: Boolean = false)

class ImportWatcherForm(val isOpen: Boolean)
