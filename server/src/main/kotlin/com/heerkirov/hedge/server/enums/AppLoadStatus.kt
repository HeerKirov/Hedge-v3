package com.heerkirov.hedge.server.enums

/**
 * 应用程序的加载状态。
 */
enum class AppLoadStatus {
    /**
     * 应用程序未初始化，无法使用。
     */
    NOT_INITIALIZED,

    /**
     * 应用程序正在初始化。
     */
    INITIALIZING,

    /**
     * 应用程序正在加载配置。
     */
    LOADING,

    /**
     * 应用程序已就绪。
     */
    READY
}