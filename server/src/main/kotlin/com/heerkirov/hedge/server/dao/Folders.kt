package com.heerkirov.hedge.server.dao

import com.heerkirov.hedge.server.model.Folder
import com.heerkirov.hedge.server.model.FolderImageRelation
import com.heerkirov.hedge.server.enums.FolderType
import com.heerkirov.hedge.server.utils.ktorm.type.enum
import com.heerkirov.hedge.server.utils.ktorm.type.json
import org.ktorm.dsl.QueryRowSet
import org.ktorm.schema.*

object Folders : BaseTable<Folder>("folder") {
    val id = int("id").primaryKey()
    val title = varchar("title")
    val type = enum("type", typeRef<FolderType>())
    val parentId = int("parent_id")
    val parentAddress = json("parent_address", typeRef<List<String>>())
    val ordinal = int("ordinal")
    val pin = int("pin")
    val cachedCount = int("cached_count")
    val createTime = datetime("create_time")
    val updateTime = datetime("update_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = Folder(
        id = row[id]!!,
        title = row[title]!!,
        type = row[type]!!,
        parentId = row[parentId],
        parentAddress = row[parentAddress],
        ordinal = row[ordinal]!!,
        pin = row[pin],
        cachedCount = row[cachedCount],
        createTime = row[createTime]!!,
        updateTime = row[updateTime]!!
    )
}

object FolderImageRelations : BaseTable<FolderImageRelation>("folder_image_relation") {
    val folderId = int("folder_id")
    val imageId = int("image_id")
    val ordinal = int("ordinal")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = FolderImageRelation(
        folderId = row[folderId]!!,
        imageId = row[imageId]!!,
        ordinal = row[ordinal]!!
    )
}
