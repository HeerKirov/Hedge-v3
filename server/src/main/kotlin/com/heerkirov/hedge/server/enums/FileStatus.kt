package com.heerkirov.hedge.server.enums

/**
 * FileRecord.status: 用于标记文件内容是否准备完毕。
 */
enum class FileStatus {
    /**
     * 文件未准备完成。
     */
    NOT_READY,

    /**
     * 文件已准备完成，已生成缩略图和其他信息。
     */
    READY,

    /**
     * 文件已准备完成，已生成其他信息，但不需要且没有生成缩略图。
     */
    READY_WITHOUT_THUMBNAIL
}