package com.heerkirov.hedge.server.dto.res


data class ExportImageRes(val id: Int, val file: String, val thumbnailFile: String)

data class ExecuteExportRes(val success: Int, val errors: List<Error>) {
    data class Error(val id: Int, val exportFilename: String, val message: String)
}