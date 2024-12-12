package com.heerkirov.hedge.server.dao

import com.heerkirov.hedge.server.enums.FileStatus
import com.heerkirov.hedge.server.enums.FingerprintStatus
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.enums.ImportStatus
import com.heerkirov.hedge.server.model.*
import com.heerkirov.hedge.server.model.FileFingerprint
import com.heerkirov.hedge.server.utils.ktorm.type.*
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
    val cachedBookIds = json("cached_book_ids", typeRef<List<Int>>())
    val cachedFolderIds = json("cached_folder_ids", typeRef<List<Int>>())
    val sourceDataId = int("source_data_id")
    val sourceSite = varchar("source_site")
    val sourceId = varchar("source_id")
    val sortableSourceId = long("sortable_source_id")
    val sourcePart = int("source_part")
    val sourcePartName = varchar("source_part_name")
    val description = text("description")
    val score = int("score")
    val favorite = boolean("favorite")
    val tagme = composition<Illust.Tagme>("tagme")
    val exportedDescription = varchar("exported_description")
    val exportedScore = int("exported_score")
    val partitionTime = instantDate("partition_time")
    val orderTime = long("order_time")
    val createTime = timestamp("create_time")
    val updateTime = timestamp("update_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = Illust(
        id = row[id]!!,
        type = row[type]!!,
        parentId = row[parentId],
        fileId = row[fileId]!!,
        cachedChildrenCount = row[cachedChildrenCount]!!,
        cachedBookCount = row[cachedBookCount]!!,
        cachedBookIds = row[cachedBookIds],
        cachedFolderIds = row[cachedFolderIds],
        sourceDataId = row[sourceDataId],
        sourceSite = row[sourceSite],
        sourceId = row[sourceId],
        sortableSourceId = row[sortableSourceId],
        sourcePart = row[sourcePart],
        sourcePartName = row[sourcePartName],
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

object AssociateRelations : BaseTable<AssociateRelation>("associate_relation") {
    val illustId = int("illust_id")
    val relatedIllustId = int("related_illust_id")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = AssociateRelation(
        illustId = row[illustId]!!,
        relatedIllustId = row[relatedIllustId]!!
    )
}

@Deprecated("annotation is deprecated.")
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

object ImportRecords : BaseTable<ImportRecord>("import_record") {
    val id = int("id").primaryKey()
    val fileId = int("file_id")
    val imageId = int("image_id")
    val status = enum("status", typeRef<ImportStatus>())
    val statusInfo = json("status_info", typeRef<ImportRecord.StatusInfo>())
    val deleted = boolean("deleted")
    val fileName = varchar("file_name")
    val filePath = varchar("file_path")
    val fileCreateTime = timestamp("file_create_time")
    val fileUpdateTime = timestamp("file_update_time")
    val importTime = timestamp("import_time")
    val deletedTime = timestamp("deleted_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = ImportRecord(
        id = row[id]!!,
        fileId = row[fileId]!!,
        imageId = row[imageId],
        status = row[status]!!,
        statusInfo = row[statusInfo],
        deleted = row[deleted]!!,
        fileName = row[fileName],
        filePath = row[filePath],
        fileCreateTime = row[fileCreateTime],
        fileUpdateTime = row[fileUpdateTime],
        importTime = row[importTime]!!,
        deletedTime = row[deletedTime]
    )
}

object TrashedImages : BaseTable<TrashedImage>("trashed_image") {
    val imageId = int("image_id")
    val parentId = int("parent_id")
    val fileId = int("file_id")
    val sourceSite = varchar("source_site")
    val sourceId = varchar("source_id")
    val sourcePart = int("source_part")
    val sourcePartName = varchar("source_part_name")
    val metadata = json("metadata", typeRef<TrashedImage.Metadata>())
    val description = varchar("description")
    val score = int("score")
    val favorite = boolean("favorite")
    val tagme = composition<Illust.Tagme>("tagme")
    val partitionTime = instantDate("partition_time")
    val orderTime = long("order_time")
    val createTime = timestamp("create_time")
    val updateTime = timestamp("update_time")
    val trashedTime = timestamp("trashed_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = TrashedImage(
        imageId = row[imageId]!!,
        parentId = row[parentId],
        fileId = row[fileId]!!,
        sourceSite = row[sourceSite],
        sourceId = row[sourceId],
        sourcePart = row[sourcePart],
        sourcePartName = row[sourcePartName],
        metadata = row[metadata]!!,
        description = row[description]!!,
        score = row[score],
        favorite = row[favorite]!!,
        tagme = row[tagme]!!,
        partitionTime = row[partitionTime]!!,
        orderTime = row[orderTime]!!,
        createTime = row[createTime]!!,
        updateTime = row[updateTime]!!,
        trashedTime = row[trashedTime]!!
    )
}

object FileRecords : BaseTable<FileRecord>("file", schema = "file_db") {
    val id = int("id").primaryKey()
    val block = varchar("block")
    val extension = varchar("extension")
    val size = long("size")
    val thumbnailSize = long("thumbnail_size")
    val sampleSize = long("sample_size")
    val resolutionWidth = int("resolution_width")
    val resolutionHeight = int("resolution_height")
    val videoDuration = long("video_duration")
    val originFilename = text("origin_filename")
    val status = enum("status", typeRef<FileStatus>())
    val fingerStatus = enum("finger_status", typeRef<FingerprintStatus>())
    val deleted = boolean("deleted")
    val createTime = timestamp("create_time")
    val updateTime = timestamp("update_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = FileRecord(
        id = row[id]!!,
        block = row[block]!!,
        extension = row[extension]!!,
        size = row[size]!!,
        thumbnailSize = row[thumbnailSize]!!,
        sampleSize = row[sampleSize]!!,
        resolutionWidth = row[resolutionWidth]!!,
        resolutionHeight = row[resolutionHeight]!!,
        videoDuration = row[videoDuration]!!,
        originFilename = row[originFilename]!!,
        status = row[status]!!,
        fingerStatus = row[fingerStatus]!!,
        deleted = row[deleted]!!,
        createTime = row[createTime]!!,
        updateTime = row[updateTime]!!
    )
}

object FileFingerprints : BaseTable<FileFingerprint>("file_fingerprint", schema = "file_db") {
    val fileId = int("file_id").primaryKey()
    val pHashSimple = text("p_hash_simple")
    val dHashSimple = text("d_hash_simple")
    val pHash = text("p_hash")
    val dHash = text("d_hash")
    val createTime = timestamp("create_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = FileFingerprint(
        fileId = row[fileId]!!,
        pHashSimple = row[pHashSimple]!!,
        dHashString = row[dHashSimple]!!,
        pHash = row[pHash]!!,
        dHash = row[dHash]!!,
        createTime = row[createTime]!!
    )
}