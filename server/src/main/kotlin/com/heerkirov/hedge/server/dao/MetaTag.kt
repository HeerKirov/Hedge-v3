package com.heerkirov.hedge.server.dao

import com.heerkirov.hedge.server.enums.*
import com.heerkirov.hedge.server.model.*
import com.heerkirov.hedge.server.utils.ktorm.type.enum
import com.heerkirov.hedge.server.utils.ktorm.type.json
import com.heerkirov.hedge.server.utils.ktorm.type.unionList
import org.ktorm.dsl.QueryRowSet
import org.ktorm.schema.*

object Keywords : BaseTable<Keyword>("keyword", schema = "meta_db") {
    val id = int("id").primaryKey()
    val tagType = enum("tag_type", typeRef<MetaType>())
    val keyword = varchar("keyword")
    val tagCount = int("tag_count")
    val lastUsedTime = timestamp("last_used_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = Keyword(
        id = row[id]!!,
        tagType = row[tagType]!!,
        keyword = row[keyword]!!,
        tagCount = row[tagCount]!!,
        lastUsedTime = row[lastUsedTime]!!
    )
}

object Tags : MetaTagTable<Tag>("tag", schema = "meta_db") {
    override val id = int("id").primaryKey()
    val globalOrdinal = int("global_ordinal")
    val ordinal = int("ordinal")
    val parentId = int("parent_id")
    override val name = varchar("name")
    override val otherNames = unionList("other_names")
    override val implicitNames = unionList("implicit_names")
    val type = enum("type", typeRef<TagAddressType>())
    val isGroup = enum("is_group", typeRef<TagGroupType>())
    val description = varchar("description")
    val color = varchar("color")
    val links = json("links", typeRef<List<Int>>())
    val examples = json("examples", typeRef<List<Int>>())
    val exportedScore = int("exported_score")
    override val cachedCount = int("cached_count")
    val createTime = timestamp("create_time")
    override val updateTime = timestamp("update_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = Tag(
        id = row[id]!!,
        globalOrdinal = row[globalOrdinal]!!,
        ordinal = row[ordinal]!!,
        parentId = row[parentId],
        name = row[name]!!,
        otherNames = row[otherNames]!!,
        implicitNames = row[implicitNames]!!,
        type = row[type]!!,
        isGroup = row[isGroup]!!,
        description = row[description]!!,
        color = row[color],
        links = row[links],
        examples = row[examples],
        exportedScore = row[exportedScore],
        cachedCount = row[cachedCount]!!,
        createTime = row[createTime]!!,
        updateTime = row[updateTime]!!
    )
}

open class Topics(alias: String?) : MetaTagTable<Topic>("topic", schema = "meta_db", alias = alias) {
    companion object : Topics(null)
    override fun aliased(alias: String) = Topics(alias)

    override val id = int("id").primaryKey()
    override val name = varchar("name")
    override val otherNames = unionList("other_names")
    override val implicitNames = unionList("implicit_names")
    val keywords = unionList("keywords")
    val parentId = int("parent_id")
    val parentRootId = int("parent_root_id")
    val type = enum("type", typeRef<TagTopicType>())
    val score = int("score")
    val favorite = boolean("favorite")
    val description = varchar("description")
    override val cachedCount = int("cached_count")
    val createTime = timestamp("create_time")
    override val updateTime = timestamp("update_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = Topic(
        id = row[id]!!,
        name = row[name]!!,
        otherNames = row[otherNames]!!,
        implicitNames = row[implicitNames]!!,
        keywords = row[keywords]!!,
        parentId = row[parentId],
        parentRootId = row[parentRootId],
        type = row[type]!!,
        score = row[score],
        favorite = row[favorite]!!,
        description = row[description]!!,
        cachedCount = row[cachedCount]!!,
        createTime = row[createTime]!!,
        updateTime = row[updateTime]!!
    )
}

object Authors : MetaTagTable<Author>("author", schema = "meta_db") {
    override val id = int("id").primaryKey()
    override val name = varchar("name")
    override val otherNames = unionList("other_names")
    override val implicitNames = unionList("implicit_names")
    val keywords = unionList("keywords")
    val type = enum("type", typeRef<TagAuthorType>())
    val score = int("score")
    val favorite = boolean("favorite")
    val description = varchar("description")
    override val cachedCount = int("cached_count")
    val createTime = timestamp("create_time")
    override val updateTime = timestamp("update_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = Author(
        id = row[id]!!,
        name = row[name]!!,
        otherNames = row[otherNames]!!,
        implicitNames = row[implicitNames]!!,
        keywords = row[keywords]!!,
        type = row[type]!!,
        score = row[score],
        favorite = row[favorite]!!,
        description = row[description]!!,
        cachedCount = row[cachedCount]!!,
        createTime = row[createTime]!!,
        updateTime = row[updateTime]!!
    )
}
