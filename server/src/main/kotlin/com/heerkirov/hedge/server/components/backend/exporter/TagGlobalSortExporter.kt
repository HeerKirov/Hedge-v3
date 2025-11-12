package com.heerkirov.hedge.server.components.backend.exporter

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.Tags
import com.heerkirov.hedge.server.dao.Topics
import com.heerkirov.hedge.server.enums.MetaType
import org.ktorm.dsl.*
import org.ktorm.entity.filter
import org.ktorm.entity.sequenceOf
import org.slf4j.LoggerFactory
import kotlin.reflect.KClass

data class TagGlobalSortExporterTask(val metaType: MetaType, val metaId: List<Int>) : ExporterTask

class TagGlobalSortExporter(private val data: DataRepository): ExporterWorker<TagGlobalSortExporterTask>, MergedProcessWorker<TagGlobalSortExporterTask>, LatencyProcessWorker {
    private val log = LoggerFactory.getLogger(TagGlobalSortExporterTask::class.java)

    override val clazz: KClass<TagGlobalSortExporterTask> = TagGlobalSortExporterTask::class

    override val latency: Long = 1000L * 10

    override fun keyof(task: TagGlobalSortExporterTask) = task.metaType.toString()

    override fun merge(tasks: List<TagGlobalSortExporterTask>): TagGlobalSortExporterTask {
        return TagGlobalSortExporterTask(tasks.first().metaType, tasks.flatMap { it.metaId }.distinct())
    }

    override fun run(task: TagGlobalSortExporterTask) {
        if(task.metaType == MetaType.TAG) {
            processTag()
        }else if(task.metaType == MetaType.TOPIC) {
            processTopic(task.metaId)
        }
    }

    private fun processTag() {
        val records = data.db.sequenceOf(Tags).asKotlinSequence().groupBy { it.parentId }

        var nextOrdinal = 0

        suspend fun SequenceScope<Pair<Int, Int>>.traverse(parentId: Int? = null) {
            val tags = records[parentId]?.sortedBy { it.ordinal }
            if(!tags.isNullOrEmpty()) {
                for(tag in tags) {
                    val globalOrdinal = nextOrdinal++
                    if(tag.globalOrdinal != globalOrdinal) {
                        yield(Pair(tag.id, globalOrdinal))
                    }
                    this.traverse(tag.id)
                }
            }
        }
        val items = sequence(SequenceScope<Pair<Int, Int>>::traverse).toList()
        if(items.isNotEmpty()) {
            data.db.transaction {
                data.db.batchUpdate(Tags) {
                    for ((id, ord) in items) {
                        item {
                            where { it.id eq id }
                            set(it.globalOrdinal, ord)
                        }
                    }
                }
            }
            log.info("{} tags global ordinal has been traversed.", items.size)
        }
    }

    private fun processTopic(topicIds: List<Int>) {
        val rootIds = data.db.from(Topics)
            .select(Topics.id, Topics.parentRootId)
            .where { Topics.id inList topicIds }
            .map { it[Topics.parentRootId] ?: it[Topics.id]!! }
            .distinct()

        for(rootId in rootIds) {
            val records = data.db.sequenceOf(Topics).filter { it.parentRootId eq rootId }.asKotlinSequence().groupBy { it.parentId }

            var nextOrdinal = 0

            suspend fun SequenceScope<Pair<Int, Int>>.traverse(parentId: Int? = null) {
                val topics = records[parentId]?.sortedBy { it.ordinal }
                if(!topics.isNullOrEmpty()) {
                    for(topic in topics) {
                        val globalOrdinal = nextOrdinal++
                        if(topic.globalOrdinal != globalOrdinal) {
                            yield(Pair(topic.id, globalOrdinal))
                        }
                        this.traverse(topic.id)
                    }
                }
            }
            val items = sequence { traverse(rootId) }.toList()
            if(items.isNotEmpty()) {
                data.db.transaction {
                    data.db.batchUpdate(Topics) {
                        for ((id, ord) in items) {
                            item {
                                where { it.id eq id }
                                set(it.globalOrdinal, ord)
                            }
                        }
                    }
                }
                log.info("Root {}: {} topics global ordinal has been traversed.", rootId, items.size)
            }
        }
    }
}