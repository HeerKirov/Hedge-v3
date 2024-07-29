package com.heerkirov.hedge.server.application

import com.heerkirov.hedge.server.utils.tools.Parameters

class ApplicationOptions(parameters: Parameters) {
    /**
     * server运行在远程模式下。该模式下server应该作为服务器端永久运行，不会自动退出，相关功能也有配合调整。
     */
    val remoteMode: Boolean = parameters.contain("--remote")

    /**
     * server运行在开发模式下。该模式下server不会自动退出。
     */
    val devMode: Boolean = parameters.contain("--dev")

    /**
     * server启动频道的根目录。一般为{USER_DATA}/appdata/channel/{CHANNEL}。
     */
    val channelPath: String = parameters["--channel-path"] ?: throw IllegalArgumentException("'--channel-path' is required.")

    /**
     * server存储目录。通常情况下不必指定此参数，存储目录会由用户设置管理。指定此参数会覆盖用户设置，或在远程模式下覆盖默认设置。
     */
    val storagePath: String? = parameters["--storage-path"]

    /**
     * 使用指定端口启动server。用于在开发模式下固定端口，以及在远程模式下必须指定启动参数。
     */
    val port: Int? = parameters["--port"]?.toInt() ?: if(this.remoteMode) throw IllegalArgumentException("'--port' is required in remote mode.") else null

    /**
     * 使用指定token启动server。用于在开发模式下固定token，以及在远程模式下必须指定启动参数。
     */
    val token: String? = parameters["--token"] ?: if(this.remoteMode) throw IllegalArgumentException("'--token' is required in remote mode.") else null
}