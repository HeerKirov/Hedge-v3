package com.heerkirov.hedge.server.utils.business

import com.heerkirov.hedge.server.constants.Filename
import com.heerkirov.hedge.server.dao.FileRecords
import com.heerkirov.hedge.server.enums.FileStatus
import org.ktorm.dsl.QueryRowSet


/**
 * 导出文件路径。
 */
fun generateFilepath(folder: String, fileId: Int, extension: String): String {
    return "${Filename.ORIGINAL_FILE_DIR}/$folder/$fileId.$extension"
}

/**
 * 导出缩略图的路径。缩略图的扩展名总是jpg。
 */
fun generateThumbnailFilepath(folder: String, fileId: Int): String {
    return "${Filename.THUMBNAIL_FILE_DIR}/$folder/$fileId.jpg"
}

/**
 * 导出示意图的路径。示意图的扩展名总是jpg。
 */
fun generateSampleFilepath(folder: String, fileId: Int): String {
    return "${Filename.SAMPLE_FILE_DIR}/$folder/$fileId.jpg"
}

/**
 * 直接从QueryRowSet中提取参数并生成file。使用前确保FileRecord的id/folder/extension都在。
 */
fun takeFilepath(it: QueryRowSet): String {
    val fileId = it[FileRecords.id]!!
    val folder = it[FileRecords.block]!!
    val extension = it[FileRecords.extension]!!
    return generateFilepath(folder, fileId, extension)
}

/**
 * 直接从QueryRowSet中提取参数并生成thumbnail file。使用前确保FileRecord的id/folder/extension/status都在。
 */
fun takeThumbnailFilepath(it: QueryRowSet): String {
    val fileId = it[FileRecords.id]!!
    val folder = it[FileRecords.block]!!
    val extension = it[FileRecords.extension]!!
    return when(it[FileRecords.status]!!) {
        FileStatus.READY -> generateThumbnailFilepath(folder, fileId)
        FileStatus.READY_WITHOUT_THUMBNAIL, FileStatus.READY_WITHOUT_THUMBNAIL_SAMPLE -> generateFilepath(folder, fileId, extension)
        FileStatus.NOT_READY -> throw NullPointerException("Thumbnail file path is null.")
    }
}

/**
 * 直接从QueryRowSet中提取参数并生成sample file。使用前确保FileRecord的id/folder/extension/status都在。
 */
fun takeSampleFilepath(it: QueryRowSet): String {
    val fileId = it[FileRecords.id]!!
    val folder = it[FileRecords.block]!!
    val extension = it[FileRecords.extension]!!
    return when(it[FileRecords.status]!!) {
        FileStatus.READY, FileStatus.READY_WITHOUT_THUMBNAIL -> generateSampleFilepath(folder, fileId)
        FileStatus.READY_WITHOUT_THUMBNAIL_SAMPLE -> generateFilepath(folder, fileId, extension)
        FileStatus.NOT_READY -> throw NullPointerException("Sample file path is null.")
    }
}

/**
 * 直接从QueryRowSet中提取参数并生成origin/thumbnail/sample file。使用前确保FileRecord的id/folder/extension/status都在。
 */
fun takeAllFilepath(it: QueryRowSet): Pair<String, String> {
    val (f, t) = takeAllFilepathOrNull(it)
    if(t == null) throw NullPointerException("Thumbnail file path is null.")
    return Pair(f, t)
}

/**
 * 直接从QueryRowSet中提取参数并生成origin/thumbnail/sample file。使用前确保FileRecord的id/folder/extension/status都在。
 * 如果文件尚未准备完毕，它有可能返回null的thumbnail。
 */
fun takeAllFilepathOrNull(it: QueryRowSet): Pair<String, String?> {
    val fileId = it[FileRecords.id]!!
    val folder = it[FileRecords.block]!!
    val extension = it[FileRecords.extension]!!
    val file = generateFilepath(folder, fileId, extension)
    val thumbnailFile = when(it[FileRecords.status]!!) {
        FileStatus.READY -> generateThumbnailFilepath(folder, fileId)
        FileStatus.READY_WITHOUT_THUMBNAIL, FileStatus.READY_WITHOUT_THUMBNAIL_SAMPLE -> file
        FileStatus.NOT_READY -> null
    }
    return Pair(file, thumbnailFile)
}