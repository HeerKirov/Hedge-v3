package com.heerkirov.hedge.server.dto.filter

import com.heerkirov.hedge.server.enums.*
import com.heerkirov.hedge.server.library.form.Limit
import com.heerkirov.hedge.server.library.form.Offset
import com.heerkirov.hedge.server.library.form.Order
import com.heerkirov.hedge.server.library.form.Search
import com.heerkirov.hedge.server.model.Annotation
import com.heerkirov.hedge.server.utils.types.OrderItem
import java.time.LocalDate

data class LimitAndOffsetFilter(@Limit val limit: Int, @Offset val offset: Int)

data class IllustQueryFilter(@Limit val limit: Int,
                             @Offset val offset: Int,
                             @Search val query: String?,
                             @Order(options = ["id", "score", "orderTime", "createTime", "updateTime"])
                             val order: List<OrderItem>? = null,
                             val topic: Int? = null,
                             val author: Int? = null,
                             val type: IllustType,
                             val partition: LocalDate? = null,
                             val favorite: Boolean? = null)

data class IllustLocationFilter(@Search val query: String?,
                                @Order(options = ["id", "score", "orderTime", "createTime", "updateTime"])
                                val order: List<OrderItem>? = null,
                                val topic: Int? = null,
                                val author: Int? = null,
                                val partition: LocalDate? = null,
                                val type: IllustType = IllustType.IMAGE,
                                val favorite: Boolean? = null,
                                val imageId: Int)

data class BookQueryFilter(@Limit val limit: Int,
                            @Offset val offset: Int,
                            @Search val query: String?,
                            @Order(options = ["id", "score", "createTime", "updateTime"])
                            val order: List<OrderItem>? = null,
                            val favorite: Boolean? = null)

data class FolderQueryFilter(@Limit val limit: Int,
                             @Offset val offset: Int,
                             @Order(options = ["id", "ordinal", "title", "createTime", "updateTime"])
                             val order: List<OrderItem>? = null,
                             val search: String? = null)

data class FolderTreeFilter(val parent: Int? = null)

data class FolderImagesFilter(@Limit val limit: Int,
                              @Offset val offset: Int,
                              @Order(options = ["id", "score", "ordinal", "orderTime", "createTime", "updateTime"])
                              val order: List<OrderItem>? = null,
                              val favorite: Boolean? = null)

data class AnnotationFilter(@Limit val limit: Int,
                            @Offset val offset: Int,
                            @Search val query: String?,
                            @Order(options = ["id", "name", "createTime"])
                            val order: List<OrderItem>? = null,
                            val type: MetaType,
                            val name: String? = null,
                            val canBeExported: Boolean? = null,
                            val target: Annotation.AnnotationTarget? = null)

data class TagFilter(@Limit val limit: Int,
                     @Offset val offset: Int,
                     @Search val search: String?,
                     @Order(options = ["id", "ordinal", "name", "createTime", "updateTime"])
                     val order: List<OrderItem>? = null,
                     val parent: Int? = null,
                     val type: TagAddressType? = null,
                     val group: Boolean? = null)

data class TagTreeFilter(val parent: Int? = null)

data class TopicFilter(@Limit val limit: Int,
                       @Offset val offset: Int,
                       @Search val query: String?,
                       @Order(options = ["id", "name", "score", "count", "createTime", "updateTime"])
                       val order: List<OrderItem>? = null,
                       val type: TagTopicType? = null,
                       val favorite: Boolean? = null,
                       val parentId: Int? = null,
                       val annotationIds: List<Int>? = null)

data class AuthorFilter(@Limit val limit: Int,
                        @Offset val offset: Int,
                        @Search val query: String?,
                        @Order(options = ["id", "name", "score", "count", "createTime", "updateTime"])
                        val order: List<OrderItem>? = null,
                        val type: TagAuthorType? = null,
                        val favorite: Boolean? = null,
                        val annotationIds: List<Int>? = null)

data class ImportFilter(@Limit val limit: Int,
                        @Offset val offset: Int,
                        @Search val search: String?,
                        @Order(options = ["id", "status", "fileCreateTime", "fileUpdateTime", "importTime"])
                        val order: List<OrderItem> = listOf(OrderItem("id", desc = false)),
                        val status: ImportStatus? = null,
                        val deleted: Boolean = false)

data class TrashFilter(@Limit val limit: Int,
                       @Offset val offset: Int,
                       @Order(options = ["id", "orderTime", "trashedTime"])
                       val order: List<OrderItem> = listOf(OrderItem("id", desc = false)))

data class PartitionFilter(val gte: LocalDate? = null,
                           val lt: LocalDate? = null,
                           val type: IllustType = IllustType.IMAGE,
                           @Search val query: String?)

data class SourceDataQueryFilter(@Limit val limit: Int,
                                 @Offset val offset: Int,
                                 @Search val query: String?,
                                 @Order(options = ["rowId", "sourceId", "site", "createTime", "updateTime"])
                                 val order: List<OrderItem>? = null,
                                 val status: List<SourceEditStatus>? = null,
                                 val site: List<String>? = null,
                                 val sourceTag: String? = null,
                                 val imageId: Int? = null)

data class FindSimilarTaskQueryFilter(@Limit val limit: Int,
                                      @Offset val offset: Int,
                                      @Order(options = ["id", "recordTime"])
                                      val order: List<OrderItem>? = null)

data class StagingPostFilter(val limit: Int? = null, val offset: Int? = null)

data class NoteFilter(@Limit val limit: Int,
                      @Offset val offset: Int,
                      @Order(options = ["status", "createTime", "updateTime"])
                      val order: List<OrderItem>? = null,
                      val status: List<NoteStatus>? = null,
                      val deleted: Boolean? = null)