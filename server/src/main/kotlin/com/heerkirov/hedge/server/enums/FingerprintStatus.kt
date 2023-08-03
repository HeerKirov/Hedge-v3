package com.heerkirov.hedge.server.enums

/**
 * FileRecord.finger_status: 用于标记指纹是否准备完毕。
 */
enum class FingerprintStatus {
    /**
     * 指纹未准备完成。
     */
    NOT_READY,

    /**
     * 指纹已准备完成。
     */
    READY,

    /**
     * 并没有指纹。
     */
    NONE
}