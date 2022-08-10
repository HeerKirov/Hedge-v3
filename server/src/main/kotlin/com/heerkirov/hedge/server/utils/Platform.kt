package com.heerkirov.hedge.server.utils

import java.util.*

object Platform {
    val systemPlatform: SystemPlatform by lazy {
        when(System.getProperty("os.name").lowercase(Locale.getDefault())) {
            "mac" -> SystemPlatform.MacOS
            "linux" -> SystemPlatform.Linux
            "win" -> SystemPlatform.Windows
            else -> SystemPlatform.Unknown
        }
    }
}

enum class SystemPlatform {
    MacOS,
    Windows,
    Linux,
    Unknown
}