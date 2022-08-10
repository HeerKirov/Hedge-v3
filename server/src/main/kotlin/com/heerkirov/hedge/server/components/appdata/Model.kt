package com.heerkirov.hedge.server.components.appdata

data class AppData(
    val service: ServiceOption,
    val proxy: ProxyOption
)

data class ServiceOption(
    var port: String?,
    var storagePath: String?
)

data class ProxyOption(
    var socks5Proxy: String?,
    var httpProxy: String?
)