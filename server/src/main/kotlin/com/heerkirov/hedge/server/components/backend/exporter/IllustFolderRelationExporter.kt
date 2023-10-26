package com.heerkirov.hedge.server.components.backend.exporter

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.functions.kit.IllustKit
import kotlin.reflect.KClass

data class IllustFolderRelationExporterTask(val imageIds: List<Int>) : ExporterTask

class IllustFolderRelationExporter(private val data: DataRepository, private val illustKit: IllustKit) : ExporterWorker<IllustFolderRelationExporterTask>, MergedProcessWorker<IllustFolderRelationExporterTask>, LatencyProcessWorker {
    override val clazz: KClass<IllustFolderRelationExporterTask> = IllustFolderRelationExporterTask::class

    override val latency: Long = 1000L * 5

    override fun keyof(task: IllustFolderRelationExporterTask): String = "any"

    override fun merge(tasks: List<IllustFolderRelationExporterTask>): IllustFolderRelationExporterTask {
        return IllustFolderRelationExporterTask(tasks.asSequence().flatMap { it.imageIds.asSequence() }.distinct().toList())
    }

    override fun run(task: IllustFolderRelationExporterTask) {
        data.db.transaction {
            illustKit.exportIllustFolderRelations(task.imageIds)
        }
    }
}