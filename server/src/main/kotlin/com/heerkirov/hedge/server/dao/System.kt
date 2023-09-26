package com.heerkirov.hedge.server.dao

import com.heerkirov.hedge.server.enums.ArchiveType
import com.heerkirov.hedge.server.model.*
import com.heerkirov.hedge.server.utils.ktorm.type.enum
import com.heerkirov.hedge.server.utils.ktorm.type.instantDate
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
    val createTime = timestamp("create_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = ExporterRecord(
        id = row[id]!!,
        type = row[type]!!,
        key = row[key]!!,
        content = row[content]!!,
        createTime = row[createTime]!!
    )
}

object HomepageRecords : BaseTable<HomepageRecord>("homepage_record", schema = "system_db") {
    val date = instantDate("date").primaryKey()
    val content = json("content", typeRef<HomepageRecord.Content>())

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = HomepageRecord(
        date = row[date]!!,
        content = row[content]!!
    )
}

object FileCacheRecords : BaseTable<FileCacheRecord>("file_cache_record", schema = "system_db") {
    val fileId = int("file_id")
    val archiveType = enum("archive_type", typeRef<ArchiveType>())
    val block = varchar("block")
    val filename = varchar("filename")
    val lastAccessTime = timestamp("last_access_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = FileCacheRecord(
        fileId = row[fileId]!!,
        archiveType = row[archiveType]!!,
        block = row[block]!!,
        filename = row[filename]!!,
        lastAccessTime = row[lastAccessTime]!!
    )
}