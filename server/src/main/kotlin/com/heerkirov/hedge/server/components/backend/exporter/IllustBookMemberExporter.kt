package com.heerkirov.hedge.server.components.backend.exporter

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.functions.kit.IllustKit
import kotlin.reflect.KClass

data class IllustBookMemberExporterTask(val imageIds: List<Int>) : ExporterTask

class IllustBookMemberExporter(private val data: DataRepository, private val illustKit: IllustKit) : ExporterWorker<IllustBookMemberExporterTask>, MergedProcessWorker<IllustBookMemberExporterTask>, LatencyProcessWorker {
    override val clazz: KClass<IllustBookMemberExporterTask> = IllustBookMemberExporterTask::class

    override val latency: Long = 1000L * 5

    override fun keyof(task: IllustBookMemberExporterTask): String = "any"

    override fun merge(tasks: List<IllustBookMemberExporterTask>): IllustBookMemberExporterTask {
        return IllustBookMemberExporterTask(tasks.asSequence().flatMap { it.imageIds.asSequence() }.distinct().toList())
    }

    override fun run(task: IllustBookMemberExporterTask) {
        data.db.transaction {
            illustKit.exportBookFlag(task.imageIds)
        }
    }
}