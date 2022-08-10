package com.heerkirov.hedge.server.components.backend.exporter

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.Books
import com.heerkirov.hedge.server.functions.kit.BookKit
import org.ktorm.dsl.eq
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import kotlin.reflect.KClass

data class BookMetadataExporterTask(val id: Int, val exportMetaTag: Boolean = false) : ExporterTask

class BookMetadataExporter(private val data: DataRepository,
                           private val bookKit: BookKit) : ExporterWorker<BookMetadataExporterTask>, MergedProcessWorker<BookMetadataExporterTask> {
    override val clazz: KClass<BookMetadataExporterTask> = BookMetadataExporterTask::class

    override fun keyof(task: BookMetadataExporterTask): String = task.id.toString()

    override fun merge(tasks: List<BookMetadataExporterTask>): BookMetadataExporterTask {
        return BookMetadataExporterTask(tasks.first().id, exportMetaTag = tasks.any { it.exportMetaTag })
    }

    override fun run(task: BookMetadataExporterTask) {
        data.db.transaction {
            if(task.exportMetaTag) {
                data.db.sequenceOf(Books).firstOrNull { it.id eq task.id } ?: return

                bookKit.refreshAllMeta(task.id)
            }
        }
    }
}