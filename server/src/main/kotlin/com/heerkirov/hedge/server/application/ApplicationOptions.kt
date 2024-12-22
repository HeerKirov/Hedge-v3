package com.heerkirov.hedge.server.application

import com.heerkirov.hedge.server.utils.registerRollingFileLog
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
     * server工作目录。在本地模式下一般为{USER_DATA}/appdata/channel/{CHANNEL}/server。
     */
    val serverDir: String = parameters["--dir"] ?: throw IllegalArgumentException("'--dir' is required.")

    /**
     * server存储目录。用于在远程模式下覆盖默认存储位置。(远程模式下存储位置配置项无效)
     */
    val storageDir: String? = parameters["--storage-dir"]

    /**
     * 当访问storage时，转发到此地址。这是只读的。用于在开发模式安全地复用生产数据。
     */
    val storageProxy: String? = parameters["--storage-proxy"]

    /**
     * 使用指定端口启动server。用于在开发模式下固定端口，以及在远程模式下必须指定启动参数。
     */
    val port: Int? = parameters["--port"]?.toInt() ?: if(this.remoteMode) throw IllegalArgumentException("'--port' is required in remote mode.") else null

    /**
     * 使用指定token启动server。用于在开发模式下固定token，以及在远程模式下必须指定启动参数。
     */
    val token: String? = parameters["--token"] ?: if(this.remoteMode) throw IllegalArgumentException("'--token' is required in remote mode.") else null

    init {
        registerRollingFileLog(serverDir)
    }
}