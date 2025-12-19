package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.BookImageRelations
import com.heerkirov.hedge.server.dao.FileRecords
import com.heerkirov.hedge.server.dao.Illusts
import com.heerkirov.hedge.server.dto.form.ExportForm
import com.heerkirov.hedge.server.dto.res.FilePath
import com.heerkirov.hedge.server.dto.res.IllustSimpleRes
import com.heerkirov.hedge.server.dto.res.SourceDataPath
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
import com.heerkirov.hedge.server.utils.tuples.Tuple3
import com.heerkirov.hedge.server.utils.writeTo
import org.ktorm.dsl.*
import org.ktorm.entity.Tuple7
import java.io.FileNotFoundException
import java.io.FileOutputStream
import java.io.OutputStream
import java.time.Instant
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
                .select(Illusts.id, Illusts.orderTime, Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, Illusts.sourcePartName, FileRecords.id, FileRecords.block, FileRecords.originFilename, FileRecords.extension)
                .where { (((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (Illusts.id inList form.imageIds)) or ((Illusts.type eq IllustModelType.IMAGE_WITH_PARENT) and (Illusts.parentId inList form.imageIds)) }
                .map { Tuple7(it[Illusts.id]!!, it[FileRecords.block]!!, it[FileRecords.id]!!, it[FileRecords.extension]!!, it[FileRecords.originFilename]!!, it[Illusts.orderTime]!!.toInstant(), sourcePathOf(it)) }
        }else if(form.bookId != null) {
            data.db.from(BookImageRelations)
                .innerJoin(Illusts, Illusts.id eq BookImageRelations.imageId)
                .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
                .select(BookImageRelations.imageId, FileRecords.id, FileRecords.block, FileRecords.originFilename, FileRecords.extension, Illusts.orderTime, Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, Illusts.sourcePartName)
                .where { BookImageRelations.bookId eq form.bookId }
                .map { Tuple7(it[BookImageRelations.imageId]!!, it[FileRecords.block]!!, it[FileRecords.id]!!, it[FileRecords.extension]!!, it[FileRecords.originFilename]!!, it[Illusts.orderTime]!!.toInstant(), sourcePathOf(it)) }
        }else{
            throw be(ParamRequired("imageIds"))
        }

        intoZip(files, form.nameType, outputStream)
    }

    /**
     * 打包导出文件，并输出到本地位置。
     */
    fun downloadExportFileLocal(form: ExportForm) {
        val files = if(form.imageIds != null) {
            data.db.from(Illusts)
                .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
                .select(Illusts.id, Illusts.orderTime, Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, Illusts.sourcePartName, FileRecords.id, FileRecords.block, FileRecords.originFilename, FileRecords.extension)
                .where { (((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)) and (Illusts.id inList form.imageIds)) or ((Illusts.type eq IllustModelType.IMAGE_WITH_PARENT) and (Illusts.parentId inList form.imageIds)) }
                .map { Tuple7(it[Illusts.id]!!, it[FileRecords.block]!!, it[FileRecords.id]!!, it[FileRecords.extension]!!, it[FileRecords.originFilename]!!, it[Illusts.orderTime]!!.toInstant(), sourcePathOf(it)) }
        }else if(form.bookId != null) {
            data.db.from(BookImageRelations)
                .innerJoin(Illusts, Illusts.id eq BookImageRelations.imageId)
                .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
                .select(BookImageRelations.imageId, FileRecords.id, FileRecords.block, FileRecords.originFilename, FileRecords.extension, Illusts.orderTime, Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, Illusts.sourcePartName)
                .where { BookImageRelations.bookId eq form.bookId }
                .map { Tuple7(it[BookImageRelations.imageId]!!, it[FileRecords.block]!!, it[FileRecords.id]!!, it[FileRecords.extension]!!, it[FileRecords.originFilename]!!, it[Illusts.orderTime]!!.toInstant(), sourcePathOf(it)) }
        }else{
            throw be(ParamRequired("imageIds"))
        }

        if(form.location == null) throw be(ParamRequired("location"))
        else if(!Path(form.location).exists()) throw be(LocationNotAccessibleError())

        if(form.packageName != null) {
            val packageFile = Path(form.location, "${form.packageName}.zip").toFile()
            if (packageFile.exists()) throw be(FileAlreadyExistsError("${form.packageName}.zip"))

            FileOutputStream(packageFile).use { fos ->
                intoZip(files, form.nameType, fos)
            }
        }else{
            intoLocal(files, form.nameType, form.location)
        }
    }

    private fun intoZip(files: List<Tuple7<Int, String, Int, String, String, Instant, SourceDataPath?>>, nameType: ExportForm.NameType, outputStream: OutputStream) {
        ZipOutputStream(outputStream).use { zos ->
            for((id, block, fileId, ext, of, ot, s) in files) {
                archive.readFile(ArchiveType.ORIGINAL, block, "$fileId.$ext")?.inputStream?.use { fis ->
                    val finalFilename = getFinalFilename(nameType, id, ext, of, s)
                    zos.putEntry(ZipEntry(finalFilename).also { entry -> entry.time = ot.toEpochMilli() }, fis)
                } ?: throw FileNotFoundException("File ${ArchiveType.ORIGINAL}/$block/$fileId.$ext not found in archive.")
            }
        }
    }

    private fun intoLocal(files: List<Tuple7<Int, String, Int, String, String, Instant, SourceDataPath?>>, nameType: ExportForm.NameType, location: String) {
        val items = files.map { (id, block, fileId, ext, of, _, s) -> Tuple3(block, "$fileId.$ext", getFinalFilename(nameType, id, ext, of, s)) }
        for ((_, _, ff) in items) if(Path(location, ff).exists()) throw be(FileAlreadyExistsError(ff))
        for ((block, filename, finalFilename) in items) {
            archive.readFile(ArchiveType.ORIGINAL, block, filename)?.inputStream?.use { fis ->
                Path(location, finalFilename).toFile().outputStream().use { fos -> fis.writeTo(fos) }
            } ?: throw FileNotFoundException("File ${ArchiveType.ORIGINAL}/$block/$filename not found in archive.")
        }
    }

    private fun getFinalFilename(nameType: ExportForm.NameType, id: Int, ext: String, of: String, s: SourceDataPath?): String {
        return when(nameType) {
            ExportForm.NameType.ORIGINAL_FILENAME -> of
            ExportForm.NameType.SOURCE -> {
                if(s != null) {
                    "${s.sourceSite}_${s.sourceId}" + (if(s.sourcePart != null) "_${s.sourcePart}" else "") + (if(s.sourcePartName != null) "_${s.sourcePartName}" else "") + ".$ext"
                }else{
                    of
                }
            }
            ExportForm.NameType.ID -> "$id.$ext"
        }
    }
}