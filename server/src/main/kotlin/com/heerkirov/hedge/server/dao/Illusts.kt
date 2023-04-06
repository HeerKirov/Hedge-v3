package com.heerkirov.hedge.server.dao

import com.heerkirov.hedge.server.enums.FileStatus
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.model.*
import com.heerkirov.hedge.server.utils.ktorm.type.composition
import com.heerkirov.hedge.server.utils.ktorm.type.enum
import com.heerkirov.hedge.server.utils.ktorm.type.json
import org.ktorm.dsl.QueryRowSet
import org.ktorm.schema.*

open class Illusts(alias: String?) : BaseTable<Illust>("illust", alias = alias) {
    companion object : Illusts(null)
    override fun aliased(alias: String) = Illusts(alias)

    val id = int("id").primaryKey()
    val type = enum("type", typeRef<IllustModelType>())
    val parentId = int("parent_id")
    val fileId = int("file_id")
    val cachedChildrenCount = int("cached_children_count")
    val cachedBookCount = int("cached_book_count")
    val sourceDataId = int("source_data_id")
    val sourceSite = varchar("source_site")
    val sourceId = long("source_id")
    val sourcePart = int("source_part")
    val description = varchar("description")
    val score = int("score")
    val favorite = boolean("favorite")
    val tagme = composition<Illust.Tagme>("tagme")
    val exportedDescription = varchar("exported_description")
    val exportedScore = int("exported_score")
    val partitionTime = date("partition_time")
    val orderTime = long("order_time")
    val createTime = datetime("create_time")
    val updateTime = datetime("update_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = Illust(
        id = row[id]!!,
        type = row[type]!!,
        parentId = row[parentId],
        fileId = row[fileId]!!,
        cachedChildrenCount = row[cachedChildrenCount]!!,
        cachedBookCount = row[cachedBookCount]!!,
        sourceDataId = row[sourceDataId],
        sourceSite = row[sourceSite],
        sourceId = row[sourceId],
        sourcePart = row[sourcePart],
        description = row[description]!!,
        score = row[score],
        favorite = row[favorite]!!,
        tagme = row[tagme]!!,
        exportedDescription = row[exportedDescription]!!,
        exportedScore = row[exportedScore],
        partitionTime = row[partitionTime]!!,
        orderTime = row[orderTime]!!,
        createTime = row[createTime]!!,
        updateTime = row[updateTime]!!
    )
}

object Partitions : BaseTable<Partition>("partition") {
    val date = date("date").primaryKey()
    val cachedCount = int("cached_count")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = Partition(
        date = row[date]!!,
        cachedCount = row[cachedCount]!!
    )
}

object AssociateRelations : BaseTable<AssociateRelation>("associate_relation") {
    val illustId = int("illust_id")
    val relatedIllustId = int("related_illust_id")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = AssociateRelation(
        illustId = row[illustId]!!,
        relatedIllustId = row[relatedIllustId]!!
    )
}

open class IllustAnnotationRelations(alias: String?) : EntityAnnotationRelationTable<IllustAnnotationRelation>("illust_annotation_relation", alias = alias) {
    companion object : IllustAnnotationRelations(null)
    override fun aliased(alias: String) = IllustAnnotationRelations(alias)

    val illustId = int("illust_id")
    val annotationId = int("annotation_id")

    override fun entityId(): Column<Int> = illustId
    override fun annotationId(): Column<Int> = annotationId

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = IllustAnnotationRelation(
        illustId = row[illustId]!!,
        annotationId = row[annotationId]!!
    )
}

open class IllustTagRelations(alias: String?) : EntityMetaRelationTable<IllustTagRelation>("illust_tag_relation", alias = alias) {
    companion object : IllustTagRelations(null)
    override fun aliased(alias: String) = IllustTagRelations(alias)

    val illustId = int("illust_id")
    val tagId = int("tag_id")
    val isExported = boolean("is_exported")

    override fun entityId(): Column<Int> = illustId
    override fun metaId(): Column<Int> = tagId
    override fun exported(): Column<Boolean> = isExported

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = IllustTagRelation(
        illustId = row[illustId]!!,
        tagId = row[tagId]!!,
        isExported = row[isExported]!!
    )
}

open class IllustTopicRelations(alias: String?) : EntityMetaRelationTable<IllustTopicRelation>("illust_topic_relation", alias = alias) {
    companion object : IllustTopicRelations(null)
    override fun aliased(alias: String) = IllustTopicRelations(alias)

    val illustId = int("illust_id")
    val topicId = int("topic_id")
    val isExported = boolean("is_exported")

    override fun entityId(): Column<Int> = illustId
    override fun metaId(): Column<Int> = topicId
    override fun exported(): Column<Boolean> = isExported

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = IllustTopicRelation(
        illustId = row[illustId]!!,
        topicId = row[topicId]!!,
        isExported = row[isExported]!!
    )
}

open class IllustAuthorRelations(alias: String?) : EntityMetaRelationTable<IllustAuthorRelation>("illust_author_relation", alias = alias) {
    companion object : IllustAuthorRelations(null)
    override fun aliased(alias: String) = IllustAuthorRelations(alias)

    val illustId = int("illust_id")
    val authorId = int("author_id")
    val isExported = boolean("is_exported")

    override fun entityId(): Column<Int> = illustId
    override fun metaId(): Column<Int> = authorId
    override fun exported(): Column<Boolean> = isExported

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = IllustAuthorRelation(
        illustId = row[illustId]!!,
        authorId = row[authorId]!!,
        isExported = row[isExported]!!
    )
}

object ImportImages : BaseTable<ImportImage>("import_image") {
    val id = int("id").primaryKey()
    val fileId = int("file_id")
    val fileName = varchar("file_name")
    val filePath = varchar("file_path")
    val fileCreateTime = datetime("file_create_time")
    val fileUpdateTime = datetime("file_update_time")
    val fileImportTime = datetime("file_import_time")
    val action = json("action", typeRef<List<ImportImage.ImportAction>>())
    val tagme = composition<Illust.Tagme>("tagme")
    val sourceSite = varchar("source_site")
    val sourceId = long("source_id")
    val sourcePart = int("source_part")
    val partitionTime = date("partition_time")
    val orderTime = long("order_time")
    val createTime = datetime("create_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = ImportImage(
        id = row[id]!!,
        fileId = row[fileId]!!,
        fileName = row[fileName],
        filePath = row[filePath],
        fileCreateTime = row[fileCreateTime],
        fileUpdateTime = row[fileUpdateTime],
        fileImportTime = row[fileImportTime]!!,
        action = row[action],
        tagme = row[tagme]!!,
        sourceSite = row[sourceSite],
        sourceId = row[sourceId],
        sourcePart = row[sourcePart],
        partitionTime = row[partitionTime]!!,
        orderTime = row[orderTime]!!,
        createTime = row[createTime]!!
    )
}

object FileRecords : BaseTable<FileRecord>("file", schema = "file_db") {
    val id = int("id").primaryKey()
    val folder = varchar("folder")
    val extension = varchar("extension")
    val size = long("size")
    val thumbnailSize = long("thumbnail_size")
    val resolutionWidth = int("resolution_width")
    val resolutionHeight = int("resolution_height")
    val status = enum("status", typeRef<FileStatus>())
    val createTime = datetime("create_time")
    val updateTime = datetime("update_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = FileRecord(
        id = row[id]!!,
        folder = row[folder]!!,
        extension = row[extension]!!,
        size = row[size]!!,
        thumbnailSize = row[thumbnailSize]!!,
        status = row[status]!!,
        resolutionWidth = row[resolutionWidth]!!,
        resolutionHeight = row[resolutionHeight]!!,
        createTime = row[createTime]!!,
        updateTime = row[updateTime]!!
    )
}