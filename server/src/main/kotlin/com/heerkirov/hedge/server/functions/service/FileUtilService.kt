package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.FileRecords
import com.heerkirov.hedge.server.dao.Illusts
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.events.IllustUpdated
import com.heerkirov.hedge.server.exceptions.NotFound
import com.heerkirov.hedge.server.exceptions.Reject
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.functions.manager.FileManager
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import org.ktorm.dsl.*

class FileUtilService(private val data: DataRepository, private val file: FileManager, private val bus: EventBus) {
    /**
     * 将指定文件的类型做轻量化转换。
     */
    fun convertFormat(illustId: Int) {
        data.db.transaction {
            val row = data.db.from(Illusts)
                .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
                .select(FileRecords.id, FileRecords.extension)
                .where { Illusts.id eq illustId }
                .firstOrNull() ?: throw be(NotFound())

            val targetExtension = when(val extension = row[FileRecords.extension]!!) {
                "png" -> "jpg"
                else -> throw be(Reject("Unsupported file extension $extension."))
            }

            file.convertFileFormat(row[FileRecords.id]!!, targetExtension)

            bus.emit(IllustUpdated(illustId, IllustType.IMAGE, detailUpdated = true))
        }
    }
}