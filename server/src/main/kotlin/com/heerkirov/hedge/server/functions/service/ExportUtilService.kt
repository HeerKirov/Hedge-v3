package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.BookImageRelations
import com.heerkirov.hedge.server.dao.FileRecords
import com.heerkirov.hedge.server.dao.Illusts
import com.heerkirov.hedge.server.dto.form.ExportForm
import com.heerkirov.hedge.server.dto.res.FilePath
import com.heerkirov.hedge.server.dto.res.IllustSimpleRes
import com.heerkirov.hedge.server.enums.ArchiveType
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.exceptions.ParamRequired
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.functions.manager.FileManager
import com.heerkirov.hedge.server.utils.business.filePathFrom
import com.heerkirov.hedge.server.utils.tuples.Tuple4
import org.ktorm.dsl.*
import java.io.FileNotFoundException
import java.io.OutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

class ExportUtilService(private val data: DataRepository, private val archive: FileManager) {
    /**
     * 根据给出的illusts列表，扩展为完整的images列表，并附带file信息。
     */
    fun getExpandedIllusts(illustIds: List<Int>): List<IllustSimpleRes> {
        data class Row(val id: Int, val parentId: Int, val filePath: FilePath)

        val rows = data.db.from(Illusts)
            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
            .select(Illusts.id, Illusts.type, Illusts.parentId, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where {
                (((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (Illusts.id inList illustIds)) or ((Illusts.type eq IllustModelType.IMAGE_WITH_PARENT) and (Illusts.parentId inList illustIds))
            }
            .orderBy(Illusts.id.asc())
            .map {
                val filePath = filePathFrom(it)
                Row(it[Illusts.id]!!, it[Illusts.parentId] ?: -1, filePath)
            }

        return rows.map { IllustSimpleRes(it.id, it.filePath) }
    }

    /**
     * 打包下载导出文件。
     */
    fun downloadExportFile(form: ExportForm, outputStream: OutputStream) {
        val files = if(form.imageIds != null) {
            data.db.from(Illusts)
                .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
                .select(Illusts.id, FileRecords.id, FileRecords.block, FileRecords.extension)
                .where { (((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (Illusts.id inList form.imageIds)) or ((Illusts.type eq IllustModelType.IMAGE_WITH_PARENT) and (Illusts.parentId inList form.imageIds)) }
                .map { Tuple4(it[Illusts.id]!!, it[FileRecords.block]!!, it[FileRecords.id]!!, it[FileRecords.extension]!!) }
        }else if(form.bookId != null) {
            data.db.from(BookImageRelations)
                .innerJoin(Illusts, Illusts.id eq BookImageRelations.imageId)
                .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
                .select(BookImageRelations.imageId, FileRecords.id, FileRecords.block, FileRecords.extension)
                .where { BookImageRelations.bookId eq form.bookId }
                .map { Tuple4(it[BookImageRelations.imageId]!!, it[FileRecords.block]!!, it[FileRecords.id]!!, it[FileRecords.extension]!!) }
        }else{
            throw be(ParamRequired("imageIds"))
        }

        ZipOutputStream(outputStream).use { zos ->
            for((id, block, fileId, ext) in files) {
                archive.readFile(ArchiveType.ORIGINAL, block, "$fileId.$ext")?.inputStream?.use { fis ->
                    zos.putNextEntry(ZipEntry("$id.$ext"))
                    var len: Int
                    val temp = ByteArray(4096)
                    while (fis.read(temp).also { len = it } != -1) {
                        zos.write(temp, 0, len)
                    }
                    zos.closeEntry()
                } ?: throw FileNotFoundException("File ${ArchiveType.ORIGINAL}/$block/$fileId.$ext not found in archive.")
            }
        }
    }
}