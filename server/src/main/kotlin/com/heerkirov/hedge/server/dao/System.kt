package com.heerkirov.hedge.server.dao

import com.heerkirov.hedge.server.model.*
import com.heerkirov.hedge.server.utils.ktorm.type.enum
import com.heerkirov.hedge.server.utils.ktorm.type.json
import org.ktorm.dsl.QueryRowSet
import org.ktorm.schema.*

object HistoryRecords : BaseTable<HistoryRecord>("history_record", schema = "system_db") {
    val sequenceId = long("sequence_id")
    val type = enum("type", typeRef<HistoryRecord.SystemHistoryRecordType>())
    val key = varchar("key")
    val recordTime = long("record_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = HistoryRecord(
        sequenceId = row[sequenceId]!!,
        type = row[type]!!,
        key = row[key]!!,
        recordTime = row[recordTime]!!
    )
}

object ExporterRecords : BaseTable<ExporterRecord>("exporter_record", schema = "system_db") {
    val id = int("id").primaryKey()
    val type = int("type")
    val key = varchar("key")
    val content = varchar("content")
    val createTime = datetime("create_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = ExporterRecord(
        id = row[id]!!,
        type = row[type]!!,
        key = row[key]!!,
        content = row[content]!!,
        createTime = row[createTime]!!
    )
}

object FindSimilarTasks : BaseTable<FindSimilarTask>("find_similar_task", schema = "system_db") {
    val id = int("id").primaryKey()
    val selector = json("selector", typeRef<FindSimilarTask.TaskSelector>())
    val config = json("config", typeRef<FindSimilarTask.TaskConfig>())
    val recordTime = datetime("record_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = FindSimilarTask(
        id = row[id]!!,
        selector = row[selector]!!,
        config = row[config],
        recordTime = row[recordTime]!!
    )
}

object FindSimilarResults : BaseTable<FindSimilarResult>("find_similar_result", schema = "system_db") {
    val id = int("id").primaryKey()
    val key = text("key")
    val type = enum("type", typeRef<FindSimilarResult.Type>())
    val imageIds = json("image_ids", typeRef<List<Int>>())
    val ordered = int("ordered")
    val recordTime = datetime("record_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = FindSimilarResult(
        id = row[id]!!,
        key = row[key]!!,
        type = row[type]!!,
        imageIds = row[imageIds]!!,
        ordered = row[ordered]!!,
        recordTime = row[recordTime]!!
    )
}