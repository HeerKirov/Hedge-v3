package com.heerkirov.hedge.server.components.backend.exporter

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.Tags
import org.ktorm.dsl.BatchUpdateStatementBuilder
import org.ktorm.dsl.batchUpdate
import org.ktorm.dsl.eq
import org.ktorm.entity.sequenceOf
import kotlin.reflect.KClass

object TagGlobalSortExporterTask : ExporterTask

class TagGlobalSortExporter(private val data: DataRepository): ExporterWorker<TagGlobalSortExporterTask>, MergedProcessWorker<TagGlobalSortExporterTask>, LatencyProcessWorker {
    override val clazz: KClass<TagGlobalSortExporterTask> = TagGlobalSortExporterTask::class

    override val latency: Long = 1000L * 10

    override fun serialize(task: TagGlobalSortExporterTask) = ""

    override fun deserialize(content: String) = TagGlobalSortExporterTask

    override fun keyof(task: TagGlobalSortExporterTask) = ""

    override fun merge(tasks: List<TagGlobalSortExporterTask>): TagGlobalSortExporterTask {
        return TagGlobalSortExporterTask
    }

    override fun run(task: TagGlobalSortExporterTask) {
        val records = data.db.sequenceOf(Tags).asKotlinSequence().groupBy { it.parentId }

        var nextOrdinal = 0

        fun BatchUpdateStatementBuilder<Tags>.traverse(parentId: Int?) {
            val tags = records[parentId]?.sortedBy { it.ordinal }
            if(!tags.isNullOrEmpty()) {
                for(tag in tags) {
                    val globalOrdinal = nextOrdinal++
                    if(tag.globalOrdinal != globalOrdinal) {
                        item {
                            where { it.id eq tag.id }
                            set(it.globalOrdinal, globalOrdinal)
                        }
                    }
                    traverse(tag.id)
                }
            }
        }

        data.db.transaction {
            data.db.batchUpdate(Tags) {
                traverse(null)
            }
        }
    }
}