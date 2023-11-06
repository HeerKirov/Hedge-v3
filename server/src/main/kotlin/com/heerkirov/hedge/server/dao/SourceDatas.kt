package com.heerkirov.hedge.server.dao

import com.heerkirov.hedge.server.enums.MetaType
import com.heerkirov.hedge.server.enums.SourceEditStatus
import com.heerkirov.hedge.server.enums.SourceMarkType
import com.heerkirov.hedge.server.model.*
import com.heerkirov.hedge.server.utils.ktorm.type.enum
import com.heerkirov.hedge.server.utils.ktorm.type.json
import org.ktorm.dsl.QueryRowSet
import org.ktorm.schema.*

object SourceDatas : BaseTable<SourceData>("source_data", schema = "source_db") {
    val id = int("id").primaryKey()
    val sourceSite = varchar("source_site")
    val sourceId = long("source_id")
    val title = varchar("title")
    val description = varchar("description")
    val relations = json("relations", typeRef<List<Long>>())
    val links = json("links", typeRef<List<String>>())
    val additionalInfo = json("additional_info", typeRef<Map<String, String>>())
    val cachedCount = json("cached_count", typeRef<SourceData.SourceCount>())
    val empty = boolean("empty")
    val status = enum("status", typeRef<SourceEditStatus>())
    val createTime = timestamp("create_time")
    val updateTime = timestamp("update_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = SourceData(
        id = row[id]!!,
        sourceSite = row[sourceSite]!!,
        sourceId = row[sourceId]!!,
        title = row[title],
        description = row[description],
        relations = row[relations],
        links = row[links],
        additionalInfo = row[additionalInfo],
        cachedCount = row[cachedCount]!!,
        empty = row[empty]!!,
        status = row[status]!!,
        createTime = row[createTime]!!,
        updateTime = row[updateTime]!!
    )
}

object SourceBooks : BaseTable<SourceBook>("source_book", schema = "source_db") {
    val id = int("id").primaryKey()
    val site = varchar("site")
    val code = varchar("code")
    val title = varchar("title")
    val otherTitle = varchar("other_title")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = SourceBook(
        id = row[id]!!,
        site = row[site]!!,
        code = row[code]!!,
        title = row[title]!!,
        otherTitle = row[otherTitle]
    )
}

open class SourceBookRelations(alias: String?) : BaseTable<SourceBookRelation>("source_book_relation", schema = "source_db", alias = alias) {
    companion object : SourceBookRelations(null)
    override fun aliased(alias: String) = SourceBookRelations(alias)

    val sourceDataId = int("source_data_id")
    val sourceBookId = int("source_book_id")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = SourceBookRelation(
        sourceDataId = row[sourceDataId]!!,
        sourceBookId = row[sourceBookId]!!
    )
}

object SourceTags : BaseTable<SourceTag>("source_tag", schema = "source_db") {
    val id = int("id").primaryKey()
    val site = varchar("site")
    val code = varchar("code")
    val name = varchar("name")
    val otherName = varchar("other_name")
    val type = varchar("type")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = SourceTag(
        id = row[id]!!,
        site = row[site]!!,
        type = row[type]!!,
        code = row[code]!!,
        name = row[name]!!,
        otherName = row[otherName]
    )
}

open class SourceTagRelations(alias: String?) : BaseTable<SourceTagRelation>("source_tag_relation", schema = "source_db", alias = alias) {
    companion object : SourceTagRelations(null)
    override fun aliased(alias: String) = SourceTagRelations(alias)

    val sourceDataId = int("source_data_id")
    val sourceTagId = int("source_tag_id")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = SourceTagRelation(
        sourceDataId = row[sourceDataId]!!,
        sourceTagId = row[sourceTagId]!!
    )
}

object SourceTagMappings : BaseTable<SourceTagMapping>("source_tag_mapping", schema = "source_db") {
    val id = int("id").primaryKey()
    val sourceSite = varchar("source_site")
    val sourceTagId = int("source_tag_id")
    val targetMetaType = enum("target_meta_type", typeRef<MetaType>())
    val targetMetaId = int("target_meta_id")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = SourceTagMapping(
        id = row[id]!!,
        sourceSite = row[sourceSite]!!,
        sourceTagId = row[sourceTagId]!!,
        targetMetaType = row[targetMetaType]!!,
        targetMetaId = row[targetMetaId]!!
    )
}

@Deprecated("已移除source mark功能")
object SourceMarks : BaseTable<SourceMark>("source_mark", schema = "source_db") {
    val sourceDataId = int("source_data_id")
    val relatedSourceDataId = int("related_source_data_id")
    val markType = enum("mark_type", typeRef<SourceMarkType>())
    val recordTime = timestamp("record_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = SourceMark(
        sourceDataId = row[sourceDataId]!!,
        relatedSourceDataId = row[relatedSourceDataId]!!,
        markType = row[markType]!!,
        recordTime = row[recordTime]!!
    )
}