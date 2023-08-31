package com.heerkirov.hedge.server.dto.res

data class ExecuteExportRes(val success: Int, val errors: List<Error>) {
    data class Error(val id: Int, val exportFilename: String, val message: String)
}

data class LoadLocalFileRes(val localFilePath: String)