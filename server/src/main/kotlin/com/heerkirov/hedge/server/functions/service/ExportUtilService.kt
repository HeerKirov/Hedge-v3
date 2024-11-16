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
import com.heerkirov.hedge.server.exceptions.FileAlreadyExistsError
import com.heerkirov.hedge.server.exceptions.LocationNotAccessibleError
import com.heerkirov.hedge.server.exceptions.ParamRequired
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.functions.manager.FileManager
import com.heerkirov.hedge.server.utils.DateTime.toInstant
import com.heerkirov.hedge.server.utils.business.filePathFrom
import com.heerkirov.hedge.server.utils.business.sourcePathOf
import com.heerkirov.hedge.server.utils.putEntry
import com.heerkirov.hedge.server.utils.tuples.Tuple6
import com.heerkirov.hedge.server.utils.writeTo
import org.ktorm.dsl.*
import java.io.FileNotFoundException
import java.io.FileOutputStream
import java.io.OutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import kotlin.io.path.Path
import kotlin.io.path.exists

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
                .select(Illusts.id, Illusts.orderTime, Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, Illusts.sourcePartName, FileRecords.id, FileRecords.block, FileRecords.extension)
                .where { (((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (Illusts.id inList form.imageIds)) or ((Illusts.type eq IllustModelType.IMAGE_WITH_PARENT) and (Illusts.parentId inList form.imageIds)) }
                .map { Tuple6(it[Illusts.id]!!, it[FileRecords.block]!!, it[FileRecords.id]!!, it[FileRecords.extension]!!, it[Illusts.orderTime]!!.toInstant(), sourcePathOf(it)) }
        }else if(form.bookId != null) {
            data.db.from(BookImageRelations)
                .innerJoin(Illusts, Illusts.id eq BookImageRelations.imageId)
                .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
                .select(BookImageRelations.imageId, FileRecords.id, FileRecords.block, FileRecords.extension, Illusts.orderTime, Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, Illusts.sourcePartName)
                .where { BookImageRelations.bookId eq form.bookId }
                .map { Tuple6(it[BookImageRelations.imageId]!!, it[FileRecords.block]!!, it[FileRecords.id]!!, it[FileRecords.extension]!!, it[Illusts.orderTime]!!.toInstant(), sourcePathOf(it)) }
        }else{
            throw be(ParamRequired("imageIds"))
        }

        ZipOutputStream(outputStream).use { zos ->
            for((id, block, fileId, ext, ot, _) in files) {
                archive.readFile(ArchiveType.ORIGINAL, block, "$fileId.$ext")?.inputStream?.use { fis ->
                    zos.putEntry(ZipEntry("$id.$ext").also { entry -> entry.time = ot.toEpochMilli() }, fis)
                } ?: throw FileNotFoundException("File ${ArchiveType.ORIGINAL}/$block/$fileId.$ext not found in archive.")
            }
        }
    }

    /**
     * 打包导出文件，并输出到本地位置。
     */
    fun downloadExportFileLocal(form: ExportForm) {
        val files = if(form.imageIds != null) {
            data.db.from(Illusts)
                .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
                .select(Illusts.id, Illusts.orderTime, Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, Illusts.sourcePartName, FileRecords.id, FileRecords.block, FileRecords.extension)
                .where { (((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (Illusts.id inList form.imageIds)) or ((Illusts.type eq IllustModelType.IMAGE_WITH_PARENT) and (Illusts.parentId inList form.imageIds)) }
                .map { Tuple6(it[Illusts.id]!!, it[FileRecords.block]!!, it[FileRecords.id]!!, it[FileRecords.extension]!!, it[Illusts.orderTime]!!.toInstant(), sourcePathOf(it)) }
        }else if(form.bookId != null) {
            data.db.from(BookImageRelations)
                .innerJoin(Illusts, Illusts.id eq BookImageRelations.imageId)
                .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
                .select(BookImageRelations.imageId, FileRecords.id, FileRecords.block, FileRecords.extension, Illusts.orderTime, Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, Illusts.sourcePartName)
                .where { BookImageRelations.bookId eq form.bookId }
                .map { Tuple6(it[BookImageRelations.imageId]!!, it[FileRecords.block]!!, it[FileRecords.id]!!, it[FileRecords.extension]!!, it[Illusts.orderTime]!!.toInstant(), sourcePathOf(it)) }
        }else{
            throw be(ParamRequired("imageIds"))
        }

        if(form.location == null) throw be(ParamRequired("location"))
        else if(!Path(form.location).exists()) throw be(LocationNotAccessibleError())

        if(form.packageName != null) {
            val packageFile = Path(form.location, "${form.packageName}.zip").toFile()
            if (packageFile.exists()) throw be(FileAlreadyExistsError("${form.packageName}.zip"))

            FileOutputStream(packageFile).use { fos ->
                ZipOutputStream(fos).use { zos ->
                    for ((id, block, fileId, ext, ot, _) in files) {
                        archive.readFile(ArchiveType.ORIGINAL, block, "$fileId.$ext")?.inputStream?.use { fis ->
                            zos.putEntry(ZipEntry("$id.$ext").also { entry -> entry.time = ot.toEpochMilli() }, fis)
                        } ?: throw FileNotFoundException("File ${ArchiveType.ORIGINAL}/$block/$fileId.$ext not found in archive.")
                    }
                }
            }
        }else{
            for ((id, _, _, ext, _, _) in files) if(Path(form.location, "$id.$ext").exists()) throw be(FileAlreadyExistsError("$id.$ext"))
            for ((id, block, fileId, ext, _, _) in files) {
                archive.readFile(ArchiveType.ORIGINAL, block, "$fileId.$ext")?.inputStream?.use { fis ->
                    Path(form.location, "$id.$ext").toFile().outputStream().use { fos -> fis.writeTo(fos) }
                } ?: throw FileNotFoundException("File ${ArchiveType.ORIGINAL}/$block/$fileId.$ext not found in archive.")
            }
        }
    }
}