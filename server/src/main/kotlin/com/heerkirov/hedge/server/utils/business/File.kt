package com.heerkirov.hedge.server.utils.business

import com.heerkirov.hedge.server.constants.Filename
import com.heerkirov.hedge.server.dao.FileRecords
import com.heerkirov.hedge.server.dto.res.FilePath
import com.heerkirov.hedge.server.dto.res.NullableFilePath
import com.heerkirov.hedge.server.enums.FileStatus
import org.ktorm.dsl.QueryRowSet


/**
 * 导出文件路径。
 */
private fun generateOriginalFilepath(block: String, fileId: Int, extension: String): String {
    return "${Filename.ORIGINAL_FILE_DIR}/$block/$fileId.$extension"
}

/**
 * 导出缩略图的路径。缩略图的扩展名总是jpg。
 */
private fun generateThumbnailFilepath(block: String, fileId: Int): String {
    return "${Filename.THUMBNAIL_FILE_DIR}/$block/$fileId.jpg"
}

/**
 * 导出示意图的路径。示意图的扩展名总是jpg。
 */
private fun generateSampleFilepath(block: String, fileId: Int): String {
    return "${Filename.SAMPLE_FILE_DIR}/$block/$fileId.jpg"
}

/**
 * 直接从QueryRowSet中提取参数并生成origin/thumbnail/sample file。使用前确保FileRecord的id/block/extension/status都在数据集中。
 */
fun filePathFrom(it: QueryRowSet): FilePath {
    val (f, t, s, e) = filePathOrNullFrom(it)
    if(t == null) throw NullPointerException("Thumbnail file path is null.")
    if(s == null) throw NullPointerException("Sample file path is null.")
    return FilePath(f, t, s, e)
}

/**
 * 直接从QueryRowSet中提取参数并生成origin/thumbnail/sample file。使用前确保FileRecord的id/block/extension/status都在数据集中。
 * 如果文件尚未准备完毕，它会返回null的thumbnail和sample。
 */
fun filePathOrNullFrom(it: QueryRowSet): NullableFilePath {
    val fileId = it[FileRecords.id]!!
    val block = it[FileRecords.block]!!
    val extension = it[FileRecords.extension]!!
    val status = it[FileRecords.status]!!
    val file = generateOriginalFilepath(block, fileId, extension)
    val thumbnailFile = when(status) {
        FileStatus.READY -> generateThumbnailFilepath(block, fileId)
        FileStatus.READY_WITHOUT_THUMBNAIL, FileStatus.READY_WITHOUT_THUMBNAIL_SAMPLE -> file
        FileStatus.NOT_READY -> null
    }
    val sampleFile = when(status) {
        FileStatus.READY, FileStatus.READY_WITHOUT_THUMBNAIL -> generateSampleFilepath(block, fileId)
        FileStatus.READY_WITHOUT_THUMBNAIL_SAMPLE -> file
        FileStatus.NOT_READY -> null
    }
    return NullableFilePath(file, thumbnailFile, sampleFile, extension)
}