package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.enums.TagAddressType
import com.heerkirov.hedge.server.enums.TagAuthorType
import com.heerkirov.hedge.server.enums.TagGroupType
import com.heerkirov.hedge.server.enums.TagTopicType
import com.heerkirov.hedge.server.library.form.Length
import com.heerkirov.hedge.server.library.form.Min
import com.heerkirov.hedge.server.library.form.NotBlank
import com.heerkirov.hedge.server.model.Annotation
import com.heerkirov.hedge.server.utils.types.Opt

data class AnnotationCreateForm(@NotBlank val name: String, val canBeExported: Boolean, val target: Annotation.AnnotationTarget = Annotation.AnnotationTarget.EMPTY)

data class AnnotationUpdateForm(@NotBlank val name: Opt<String>, val canBeExported: Opt<Boolean>, val target: Opt<Annotation.AnnotationTarget>)

data class TagCreateForm(@NotBlank @Length(32) val name: String,
                         val otherNames: List<String>? = null,
                         @Min(0) val ordinal: Int? = null,
                         val parentId: Int?,
                         val type: TagAddressType,
                         val group: TagGroupType = TagGroupType.NO,
                         val links: List<Int>? = null,
                         val annotations: List<Any>? = null,
                         val description: String = "",
                         val color: String? = null,
                         val examples: List<Int>? = null,
                         val mappingSourceTags: List<SourceMappingMetaItemForm>? = null)

data class TagUpdateForm(@NotBlank @Length(32) val name: Opt<String>,
                         val otherNames: Opt<List<String>?>,
                         @Min(0) val ordinal: Opt<Int>,
                         val parentId: Opt<Int?>,
                         val type: Opt<TagAddressType>,
                         val group: Opt<TagGroupType>,
                         val links: Opt<List<Int>?>,
                         val annotations: Opt<List<Any>?>,
                         val description: Opt<String>,
                         val color: Opt<String>,
                         val examples: Opt<List<Int>?>,
                         val mappingSourceTags: Opt<List<SourceMappingMetaItemForm>?>)

data class TopicCreateForm(@NotBlank val name: String,
                           val otherNames: List<String>? = null,
                           val parentId: Int? = null,
                           val type: TagTopicType = TagTopicType.UNKNOWN,
                           val keywords: List<String>? = null,
                           val description: String = "",
                           val annotations: List<Any>? = null,
                           val favorite: Boolean = false,
                           val score: Int? = null,
                           val mappingSourceTags: List<SourceMappingMetaItemForm>? = null)

data class TopicUpdateForm(@NotBlank val name: Opt<String>,
                           val otherNames: Opt<List<String>?>,
                           val parentId: Opt<Int?>,
                           val type: Opt<TagTopicType>,
                           val keywords: Opt<List<String>?>,
                           val description: Opt<String>,
                           val annotations: Opt<List<Any>?>,
                           val favorite: Opt<Boolean>,
                           val score: Opt<Int?>,
                           val mappingSourceTags: Opt<List<SourceMappingMetaItemForm>?>)

data class AuthorCreateForm(@NotBlank val name: String,
                            val otherNames: List<String>? = null,
                            val type: TagAuthorType = TagAuthorType.UNKNOWN,
                            val keywords: List<String>? = null,
                            val description: String = "",
                            val annotations: List<Any>? = null,
                            val favorite: Boolean = false,
                            val score: Int? = null,
                            val mappingSourceTags: List<SourceMappingMetaItemForm>? = null)

data class AuthorUpdateForm(@NotBlank val name: Opt<String>,
                            val otherNames: Opt<List<String>?>,
                            val type: Opt<TagAuthorType>,
                            val keywords: Opt<List<String>?>,
                            val description: Opt<String>,
                            val annotations: Opt<List<Any>?>,
                            val favorite: Opt<Boolean>,
                            val score: Opt<Int?>,
                            val mappingSourceTags: Opt<List<SourceMappingMetaItemForm>?>)
