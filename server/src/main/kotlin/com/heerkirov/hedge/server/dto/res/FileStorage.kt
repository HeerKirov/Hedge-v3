package com.heerkirov.hedge.server.dto.res

import java.time.Instant

/**
 * 单个 block 的汇总信息。
 */
data class BlockStorageSummaryRes(
    val name: String,
    val fileCount: Int,
    val totalSize: Long,
    val hasZipFile: Boolean,
    val hasDirectory: Boolean,
)

/**
 * block 内单个文件的清单项。
 */
data class BlockFileItemRes(
    val id: Int,
    val fileName: String,
    val createTime: Instant,
    val size: Long,
    val resolutionWidth: Int,
    val resolutionHeight: Int,
    val extension: String,
    /**
     * 原始文件是否以松散文件形式存在于 block 目录下（而非仅在 zip 内）。
     */
    val inBlockDirectory: Boolean,
)
