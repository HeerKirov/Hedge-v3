package com.heerkirov.hedge.server.application

class ApplicationOptions(
    /**
     * server启动频道的根目录。一般为{USER_DATA}/appdata/channel/{CHANNEL}。
     */
    val channelPath: String,
    /**
     * 告知server直接以permanent模式启动。
     */
    val permanent: Boolean = false,
    /**
     * 强制使用此单一端口启动server，用于固定端口的开发模式。
     */
    val forcePort: Int? = null,
    /**
     * 强制使用此token启动server，用于固定token的开发模式。
     */
    val forceToken: String? = null
)