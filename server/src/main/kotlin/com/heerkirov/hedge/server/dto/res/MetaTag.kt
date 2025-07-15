package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.enums.*
import com.heerkirov.hedge.server.model.Author
import com.heerkirov.hedge.server.model.Topic
import com.heerkirov.hedge.server.model.Tag
import com.heerkirov.hedge.server.utils.tuples.Tuple3
import java.time.Instant

data class TagRes(val id: Int, val ordinal: Int, val parentId: Int?,
                  val name: String, val otherNames: List<String>,
                  val type: TagAddressType, val group: TagGroupType, val color: String?)

data class TagSimpleRes(val id: Int, val name: String, val color: String?, val isExported: Boolean)

data class TagTreeNode(val id: Int, val name: String, val otherNames: List<String>, val implicitNames: List<String>,
                       val type: TagAddressType, val group: TagGroupType, val color: String?,
                       val children: List<TagTreeNode>?)

data class TagDetailRes(val id: Int, val ordinal: Int, val parentId: Int?, val parents: List<Parent>,
                        val name: String, val otherNames: List<String>,
                        val type: TagAddressType, val group: TagGroupType, val links: List<Link>,
                        val description: String, val color: String?,
                        val examples: List<IllustSimpleRes>,
                        val score: Int?, val count: Int,
                        val mappingSourceTags: List<MappingSourceTagDto>) {

    data class Link(val id: Int, val name: String, val type: TagAddressType, val group: TagGroupType, val color: String?)

    data class Parent(val id: Int, val name: String, val type: TagAddressType, val group: TagGroupType)
}


data class TopicRes(val id: Int, val name: String, val parentRoot: TopicParent?, val parentId: Int?,
                    val otherNames: List<String>, val keywords: List<String>,
                    val type: TagTopicType, val favorite: Boolean,
                    val score: Int?, val count: Int, val color: String?)

data class TopicSimpleRes(val id: Int, val name: String, val type: TagTopicType, val isExported: Boolean, val color: String?)

data class TopicDetailRes(val id: Int, val name: String, val parentRoot: TopicParent?, val parentId: Int?, val parents: List<TopicParent>, val children: List<TopicChildrenNode>?,
                          val otherNames: List<String>, val keywords: List<String>, val description: String,
                          val type: TagTopicType, val favorite: Boolean,
                          val score: Int?, val count: Int, val color: String?,
                          val mappingSourceTags: List<MappingSourceTagDto>)

data class TopicParent(val id: Int, val name: String, val type: TagTopicType, val color: String?)

data class TopicChildrenNode(val id: Int, val name: String, val type: TagTopicType, val color: String?, val children: List<TopicChildrenNode>?)

data class AuthorRes(val id: Int, val name: String, val otherNames: List<String>, val keywords: List<String>,
                     val type: TagAuthorType, val favorite: Boolean,
                     val score: Int?, val count: Int, val color: String?)

data class AuthorSimpleRes(val id: Int, val name: String, val type: TagAuthorType, val isExported: Boolean, val color: String?)

data class AuthorDetailRes(val id: Int, val name: String, val otherNames: List<String>, val keywords: List<String>, val description: String,
                           val type: TagAuthorType, val favorite: Boolean,
                           val score: Int?, val count: Int, val color: String?,
                           val mappingSourceTags: List<MappingSourceTagDto>)

data class KeywordInfo(val tagType: MetaType, val keyword: String, val count: Int, val lastUsedTime: Instant)

fun newTagRes(tag: Tag) = TagRes(tag.id, tag.ordinal, tag.parentId, tag.name, tag.otherNames, tag.type, tag.isGroup, tag.color)

fun newTagTreeNode(tag: Tag, children: List<TagTreeNode>?) = TagTreeNode(tag.id, tag.name, tag.otherNames, tag.implicitNames, tag.type, tag.isGroup, tag.color, children)

fun newTagDetailRes(tag: Tag, parents: List<TagDetailRes.Parent>,
                    links: List<TagDetailRes.Link>,
                    examples: List<IllustSimpleRes>,
                    mappingSourceTags: List<MappingSourceTagDto>) = TagDetailRes(
    tag.id, tag.ordinal, tag.parentId, parents,
    tag.name, tag.otherNames, tag.type, tag.isGroup,
    links, tag.description, tag.color,
    examples, tag.exportedScore, tag.cachedCount, mappingSourceTags)

fun newTopicRes(topic: Topic, rootTopic: Tuple3<Int, String, TagTopicType>?, colors: Map<TagTopicType, String>) = TopicRes(topic.id, topic.name,
    rootTopic?.let { (id, name, type) -> TopicParent(id, name, type, colors[type]) }, topic.parentId,
    topic.otherNames, topic.keywords, topic.type, topic.favorite,
    topic.score, topic.cachedCount, colors[topic.type])

fun newTopicDetailRes(topic: Topic, parents: List<Topic>, children: List<TopicChildrenNode>?, colors: Map<TagTopicType, String>, mappingSourceTags: List<MappingSourceTagDto>) = TopicDetailRes(
    topic.id, topic.name,
    parents.firstOrNull { it.id == topic.parentRootId }?.let { TopicParent(it.id, it.name, it.type, colors[it.type]) }, topic.parentId,
    parents.map { TopicParent(it.id, it.name, it.type, colors[it.type]) }, children,
    topic.otherNames, topic.keywords, topic.description, topic.type, topic.favorite,
    topic.score, topic.cachedCount, colors[topic.type], mappingSourceTags)

fun newAuthorRes(author: Author, colors: Map<TagAuthorType, String>) = AuthorRes(
    author.id, author.name, author.otherNames, author.keywords, author.type, author.favorite,
    author.score, author.cachedCount, colors[author.type])

fun newAuthorDetailRes(author: Author, colors: Map<TagAuthorType, String>, mappingSourceTags: List<MappingSourceTagDto>) = AuthorDetailRes(
    author.id, author.name, author.otherNames, author.keywords, author.description, author.type, author.favorite,
    author.score, author.cachedCount, colors[author.type], mappingSourceTags)