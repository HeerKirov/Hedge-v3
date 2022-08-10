package com.heerkirov.hedge.server.utils.business

import com.heerkirov.hedge.server.dao.FileRecords
import com.heerkirov.hedge.server.enums.FileStatus
import org.ktorm.dsl.QueryRowSet


/**
 * 导出文件路径。
 */
fun generateFilepath(folder: String, fileId: Int, extension: String): String {
    return "original/$folder/$fileId.$extension"
}

/**
 * 导出缩略图的路径。缩略图的扩展名总是jpg。
 */
fun generateThumbnailFilepath(folder: String, fileId: Int): String {
    return "thumbnail/$folder/$fileId.jpg"
}

/**
 * 直接从QueryRowSet中提取参数并生成file。使用前确保FileRecord的id/folder/extension都在。
 */
fun takeFilepath(it: QueryRowSet): String {
    val fileId = it[FileRecords.id]!!
    val folder = it[FileRecords.folder]!!
    val extension = it[FileRecords.extension]!!
    return generateFilepath(folder, fileId, extension)
}

/**
 * 直接从QueryRowSet中提取参数并生成thumbnail file。使用前确保FileRecord的id/folder/extension/thumbnail都在。
 */
fun takeThumbnailFilepath(it: QueryRowSet): String {
    val fileId = it[FileRecords.id]!!
    val folder = it[FileRecords.folder]!!
    val extension = it[FileRecords.extension]!!
    return when(it[FileRecords.status]!!) {
        FileStatus.READY -> generateThumbnailFilepath(folder, fileId)
        FileStatus.READY_WITHOUT_THUMBNAIL -> generateFilepath(folder, fileId, extension)
        FileStatus.NOT_READY -> throw NullPointerException("Thumbnail file path is null.")
    }
}

/**
 * 直接从QueryRowSet中提取参数并生成file和thumbnail file。使用前确保FileRecord的id/folder/extension/thumbnail都在。
 */
fun takeAllFilepath(it: QueryRowSet): Pair<String, String> {
    val (f, t) = takeAllFilepathOrNull(it)
    if(t == null) throw NullPointerException("Thumbnail file path is null.")
    return Pair(f, t)
}

/**
 * 直接从QueryRowSet中提取参数并生成file和thumbnail file。使用前确保FileRecord的id/folder/extension/thumbnail都在。
 * 它有可能返回null的thumbnail。
 */
fun takeAllFilepathOrNull(it: QueryRowSet): Pair<String, String?> {
    val fileId = it[FileRecords.id]!!
    val folder = it[FileRecords.folder]!!
    val extension = it[FileRecords.extension]!!
    val file = generateFilepath(folder, fileId, extension)
    val thumbnailFile = when(it[FileRecords.status]!!) {
        FileStatus.READY -> generateThumbnailFilepath(folder, fileId)
        FileStatus.READY_WITHOUT_THUMBNAIL -> file
        FileStatus.NOT_READY -> null
    }
    return Pair(file, thumbnailFile)
}