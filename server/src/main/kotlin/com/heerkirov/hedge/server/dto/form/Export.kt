package com.heerkirov.hedge.server.dto.form

data class ExecuteExportForm(val location: String,
                             val packageName: String? = null,
                             val imageIds: List<Int>? = null,
                             val bookId: Int? = null)

data class LoadLocalFileForm(val filepath: String)