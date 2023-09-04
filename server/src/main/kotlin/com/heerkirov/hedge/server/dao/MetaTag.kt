package com.heerkirov.hedge.server.dao

import com.heerkirov.hedge.server.enums.*
import com.heerkirov.hedge.server.model.*
import com.heerkirov.hedge.server.model.Annotation
import com.heerkirov.hedge.server.utils.ktorm.type.composition
import com.heerkirov.hedge.server.utils.ktorm.type.enum
import com.heerkirov.hedge.server.utils.ktorm.type.json
import com.heerkirov.hedge.server.utils.ktorm.type.unionList
import org.ktorm.dsl.QueryRowSet
import org.ktorm.schema.*

open class Annotations(alias: String? = null) : BaseTable<Annotation>("annotation", schema = "meta_db", alias = alias) {
    companion object : Annotations(null)
    override fun aliased(alias: String) = Annotations(alias)

    val id = int("id").primaryKey()
    val name = varchar("name")
    val canBeExported = boolean("can_be_exported")
    val type = enum("type", typeRef<MetaType>())
    val target = composition<Annotation.AnnotationTarget>("target")
    val createTime = timestamp("create_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = Annotation(
        id = row[id]!!,
        name = row[name]!!,
        canBeExported = row[canBeExported]!!,
        type = row[type]!!,
        target = row[target]!!,
        createTime = row[createTime]!!
    )
}

object Tags : MetaTagTable<Tag>("tag", schema = "meta_db") {
    override val id = int("id").primaryKey()
    val globalOrdinal = int("global_ordinal")
    val ordinal = int("ordinal")
    val parentId = int("parent_id")
    override val name = varchar("name")
    override val otherNames = unionList("other_names")
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
    val keywords = unionList("keywords")
    val parentId = int("parent_id")
    val parentRootId = int("parent_root_id")
    val type = enum("type", typeRef<TagTopicType>())
    val score = int("score")
    val favorite = boolean("favorite")
    val description = varchar("description")
    override val cachedCount = int("cached_count")
    val cachedAnnotations = json("cached_annotations", typeRef<List<Topic.CachedAnnotation>>())
    val createTime = timestamp("create_time")
    override val updateTime = timestamp("update_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = Topic(
        id = row[id]!!,
        name = row[name]!!,
        otherNames = row[otherNames]!!,
        keywords = row[keywords]!!,
        parentId = row[parentId],
        parentRootId = row[parentRootId],
        type = row[type]!!,
        score = row[score],
        favorite = row[favorite]!!,
        description = row[description]!!,
        cachedCount = row[cachedCount]!!,
        cachedAnnotations = row[cachedAnnotations],
        createTime = row[createTime]!!,
        updateTime = row[updateTime]!!
    )
}

object Authors : MetaTagTable<Author>("author", schema = "meta_db") {
    override val id = int("id").primaryKey()
    override val name = varchar("name")
    override val otherNames = unionList("other_names")
    val keywords = unionList("keywords")
    val type = enum("type", typeRef<TagAuthorType>())
    val score = int("score")
    val favorite = boolean("favorite")
    val description = varchar("description")
    override val cachedCount = int("cached_count")
    val cachedAnnotations = json("cached_annotations", typeRef<List<Author.CachedAnnotation>>())
    val createTime = timestamp("create_time")
    override val updateTime = timestamp("update_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = Author(
        id = row[id]!!,
        name = row[name]!!,
        otherNames = row[otherNames]!!,
        keywords = row[keywords]!!,
        type = row[type]!!,
        score = row[score],
        favorite = row[favorite]!!,
        description = row[description]!!,
        cachedCount = row[cachedCount]!!,
        cachedAnnotations = row[cachedAnnotations],
        createTime = row[createTime]!!,
        updateTime = row[updateTime]!!
    )
}

object TagAnnotationRelations : MetaAnnotationRelationTable<TagAnnotationRelation>("tag_annotation_relation", schema = "meta_db") {
    val tagId = int("tag_id")
    val annotationId = int("annotation_id")

    override fun metaId(): Column<Int> = tagId
    override fun annotationId(): Column<Int> = annotationId

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = TagAnnotationRelation(
        tagId = row[tagId]!!,
        annotationId = row[annotationId]!!
    )
}

open class TopicAnnotationRelations(alias: String?) : MetaAnnotationRelationTable<TopicAnnotationRelation>("topic_annotation_relation", schema = "meta_db", alias = alias) {
    companion object : TopicAnnotationRelations(null)
    override fun aliased(alias: String) = TopicAnnotationRelations(alias)

    val topicId = int("topic_id")
    val annotationId = int("annotation_id")

    override fun metaId(): Column<Int> = topicId
    override fun annotationId(): Column<Int> = annotationId

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = TopicAnnotationRelation(
        topicId = row[topicId]!!,
        annotationId = row[annotationId]!!
    )
}

open class AuthorAnnotationRelations(alias: String?) : MetaAnnotationRelationTable<AuthorAnnotationRelation>("author_annotation_relation", schema = "meta_db", alias = alias) {
    companion object : AuthorAnnotationRelations(null)
    override fun aliased(alias: String) = AuthorAnnotationRelations(alias)

    val authorId = int("author_id")
    val annotationId = int("annotation_id")

    override fun metaId(): Column<Int> = authorId
    override fun annotationId(): Column<Int> = annotationId

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = AuthorAnnotationRelation(
        authorId = row[authorId]!!,
        annotationId = row[annotationId]!!
    )
}