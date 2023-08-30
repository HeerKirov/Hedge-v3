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
    //thumbnail的选取：直接选thumbnail，没有thumbnail时，如果是jpeg可以选original，否则应该先选sample，sample也没有最后才可选original
    //这是因为jpeg的thumbnail不存在而sample存在时，唯一的可能是文件尺寸正位于sample-thumbnail区间，此时original充当了thumbnail的作用
    //而其他文件类型出现这种情况唯一的可能是文件尺寸小于sample，否则一定是有thumbnail的
    //这个比较怪异的选择逻辑是为了贴合FileGenerator的生成逻辑与FileStatus的枚举值。详情参考FileGenerator那边。
    val thumbnailFile = when(status) {
        FileStatus.READY -> generateThumbnailFilepath(block, fileId)
        FileStatus.READY_WITHOUT_THUMBNAIL -> if(extension == "jpg" || extension == "jpeg") file else generateSampleFilepath(block, fileId)
        FileStatus.READY_WITHOUT_THUMBNAIL_SAMPLE -> file
        FileStatus.NOT_READY -> null
    }
    //sample的选取：直接选sample,没有sample时必定也没有thumbnail，这时才选original
    val sampleFile = when(status) {
        FileStatus.READY, FileStatus.READY_WITHOUT_THUMBNAIL -> generateSampleFilepath(block, fileId)
        FileStatus.READY_WITHOUT_THUMBNAIL_SAMPLE -> file
        FileStatus.NOT_READY -> null
    }
    return NullableFilePath(file, thumbnailFile, sampleFile, extension)
}