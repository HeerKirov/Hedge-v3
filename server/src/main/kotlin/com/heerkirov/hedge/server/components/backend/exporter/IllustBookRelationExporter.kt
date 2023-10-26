package com.heerkirov.hedge.server.components.backend.exporter

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.functions.kit.IllustKit
import kotlin.reflect.KClass

data class IllustBookRelationExporterTask(val imageIds: List<Int>) : ExporterTask

class IllustBookRelationExporter(private val data: DataRepository, private val illustKit: IllustKit) : ExporterWorker<IllustBookRelationExporterTask>, MergedProcessWorker<IllustBookRelationExporterTask>, LatencyProcessWorker {
    override val clazz: KClass<IllustBookRelationExporterTask> = IllustBookRelationExporterTask::class

    override val latency: Long = 1000L * 5

    override fun keyof(task: IllustBookRelationExporterTask): String = "any"

    override fun merge(tasks: List<IllustBookRelationExporterTask>): IllustBookRelationExporterTask {
        return IllustBookRelationExporterTask(tasks.asSequence().flatMap { it.imageIds.asSequence() }.distinct().toList())
    }

    override fun run(task: IllustBookRelationExporterTask) {
        data.db.transaction {
            illustKit.exportIllustBookRelations(task.imageIds)
        }
    }
}