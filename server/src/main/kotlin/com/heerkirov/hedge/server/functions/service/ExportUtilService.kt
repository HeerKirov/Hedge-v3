package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.enums.ArchiveType
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.BookImageRelations
import com.heerkirov.hedge.server.dao.FileRecords
import com.heerkirov.hedge.server.dao.Illusts
import com.heerkirov.hedge.server.dto.form.ExecuteExportForm
import com.heerkirov.hedge.server.dto.res.ExecuteExportRes
import com.heerkirov.hedge.server.dto.res.ExportImageRes
import com.heerkirov.hedge.server.dto.res.FilePath
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.exceptions.LocationNotAccessibleError
import com.heerkirov.hedge.server.exceptions.ParamRequired
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.functions.manager.FileManager
import com.heerkirov.hedge.server.utils.business.filePathFrom
import com.heerkirov.hedge.server.utils.tuples.Tuple4
import org.ktorm.dsl.*
import java.io.File
import java.io.FileNotFoundException
import java.io.FileOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import kotlin.io.path.Path

class ExportUtilService(private val appdata: AppDataManager, private val data: DataRepository, private val archive: FileManager) {
    /**
     * 根据给出的illusts列表，扩展为完整的images列表，并附带file信息。
     */
    fun getExpandedIllusts(illustIds: List<Int>): List<ExportImageRes> {
        data class Row(val id: Int, val parentId: Int, val filePath: FilePath)

        val rows = data.db.from(Illusts)
            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
            .select(Illusts.id, Illusts.type, Illusts.parentId, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { ((Illusts.type eq IllustModelType.IMAGE) and (Illusts.id inList illustIds)) or ((Illusts.type eq IllustModelType.IMAGE_WITH_PARENT) and (Illusts.parentId inList illustIds)) }
            .map {
                val filePath = filePathFrom(it)
                Row(it[Illusts.id]!!, it[Illusts.parentId] ?: -1, filePath)
            }
            .groupBy { it.parentId }

        val images = rows[-1]?.associateBy { it.id } ?: emptyMap()

        return illustIds.flatMap { id ->
            when (id) {
                in images -> {
                    val row = images[id]!!
                    listOf(ExportImageRes(row.id, row.filePath))
                }
                in rows -> rows[id]!!.map { ExportImageRes(it.id, it.filePath) }
                else -> emptyList()
            }
        }
    }

    /**
     * 执行导出动作。
     * 导出动作由后端实现，实现方式是把文件拷贝到目标位置。
     */
    fun executeExport(form: ExecuteExportForm): ExecuteExportRes {
        val files = if(form.imageIds != null) {
            data.db.from(Illusts)
                .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
                .select(Illusts.id, FileRecords.id, FileRecords.block, FileRecords.extension)
                .where { ((Illusts.type eq IllustModelType.IMAGE) and (Illusts.id inList form.imageIds)) or ((Illusts.type eq IllustModelType.IMAGE_WITH_PARENT) and (Illusts.parentId inList form.imageIds)) }
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

        if(form.packageName != null) {
            val packageFile = Path(form.location, "${form.packageName}.zip").toFile()
            if(packageFile.exists()) throw be(LocationNotAccessibleError())

            FileOutputStream(packageFile).use { fos ->
                ZipOutputStream(fos).use { zos ->
                    for((id, block, fileId, ext) in files) {
                        archive.readInputStream(ArchiveType.ORIGINAL, block, "$fileId.$ext")?.use { fis ->
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

            return ExecuteExportRes(files.size, emptyList())
        }else{
            val location = File(form.location)
            if(!location.exists() || !location.isDirectory || !location.canWrite()) throw be(LocationNotAccessibleError())

            val errors = mutableListOf<ExecuteExportRes.Error>()

            for((id, file, ext) in files) {
                try {
                    File("${appdata.storagePathAccessor.storageDir}/$file").copyTo(Path(form.location, "$id.$ext").toFile())
                }catch (e: Exception) {
                    errors.add(ExecuteExportRes.Error(id, "$id.$ext", e.message ?: e.stackTraceToString()))
                }
            }

            return ExecuteExportRes(files.size - errors.size, errors)
        }
    }
}