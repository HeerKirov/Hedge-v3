package com.heerkirov.hedge.server.components.appdata

data class AppData(
    val service: ServiceOption
)

data class ServiceOption(
    var port: String?,
    var storagePath: String?
)
