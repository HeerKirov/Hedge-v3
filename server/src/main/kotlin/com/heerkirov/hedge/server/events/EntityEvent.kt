package com.heerkirov.hedge.server.events

import com.heerkirov.hedge.server.enums.FolderType
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.enums.MetaType
import com.heerkirov.hedge.server.enums.NoteStatus

/**
 * 实体事件，指实体变更等。
 * 实体变更是指server中的entity发生新增、删除、属性变化、从属关系变化。当这些事情发生时，有通知前端以及部分响应组件的必要。
 */
interface EntityEvent : BaseBusEvent

interface AnnotationEntityEvent : EntityEvent { val annotationId: Int; val type: MetaType }

data class AnnotationCreated(override val annotationId: Int, override val type: MetaType) : BaseBusEventImpl("entity/annotation/created"), AnnotationEntityEvent

data class AnnotationUpdated(override val annotationId: Int, override val type: MetaType) : BaseBusEventImpl("entity/annotation/updated"), AnnotationEntityEvent

data class AnnotationDeleted(override val annotationId: Int, override val type: MetaType) : BaseBusEventImpl("entity/annotation/deleted"), AnnotationEntityEvent

interface MetaTagEntityEvent : EntityEvent { val metaId: Int; val metaType: MetaType }

data class MetaTagCreated(override val metaId: Int, override val metaType: MetaType) : BaseBusEventImpl("entity/meta-tag/created"), MetaTagEntityEvent

/**
 * @param listUpdated list API相关属性变更。
 * @param detailUpdated retrieve API相关属性变更。
 * @param annotationSot 注解变更。
 * @param parentSot topic的parent变更、tag的parent/ordinal变更。
 * @param sourceTagMappingSot 与之相关的映射变更。
 */
data class MetaTagUpdated(override val metaId: Int, override val metaType: MetaType,
                          val listUpdated: Boolean,
                          val detailUpdated: Boolean,
                          val annotationSot: Boolean,
                          val parentSot: Boolean,
                          val sourceTagMappingSot: Boolean) : BaseBusEventImpl("entity/meta-tag/updated"), MetaTagEntityEvent

data class MetaTagDeleted(override val metaId: Int, override val metaType: MetaType) : BaseBusEventImpl("entity/meta-tag/deleted"), MetaTagEntityEvent

interface IllustEntityEvent : EntityEvent { val illustId: Int; val illustType: IllustType }

data class IllustCreated(override val illustId: Int, override val illustType: IllustType) : BaseBusEventImpl("entity/illust/created"), IllustEntityEvent

/**
 * @param listUpdated list API相关属性变更。
 * @param detailUpdated retrieve API相关属性变更。
 * @param metaTagSot 标签变更。
 * @param descriptionSot 描述变更。
 * @param scoreSot 评分变更。
 * @param favoriteSot 收藏状态变更。
 * @param timeSot partitionTime/orderTime变更。
 */
data class IllustUpdated(override val illustId: Int, override val illustType: IllustType,
                         val listUpdated: Boolean = false,
                         val detailUpdated: Boolean = false,
                         val descriptionSot: Boolean = false,
                         val scoreSot: Boolean = false,
                         val favoriteSot: Boolean = false,
                         val timeSot: Boolean = false,
                         val metaTagSot: Boolean = false) : BaseBusEventImpl("entity/illust/updated"), IllustEntityEvent

data class IllustDeleted(override val illustId: Int, override val illustType: IllustType) : BaseBusEventImpl("entity/illust/deleted"), IllustEntityEvent

data class IllustSourceDataUpdated(override val illustId: Int, override val illustType: IllustType = IllustType.IMAGE) : BaseBusEventImpl("entity/illust/source-data/updated"), IllustEntityEvent

data class IllustRelatedItemsUpdated(override val illustId: Int, override val illustType: IllustType,
                                     val associateSot: Boolean = false,
                                     val collectionSot: Boolean = false,
                                     val folderUpdated: Boolean = false,
                                     val bookUpdated: Boolean = false) : BaseBusEventImpl("entity/illust/related-items/updated"), IllustEntityEvent

data class IllustImagesChanged(override val illustId: Int, val added: List<Int>, val deleted: List<Int>, override val illustType: IllustType = IllustType.COLLECTION) : BaseBusEventImpl("entity/illust/images/changed"), IllustEntityEvent

interface BookEntityEvent : EntityEvent { val bookId: Int }

data class BookCreated(override val bookId: Int) : BaseBusEventImpl("entity/book/created"), BookEntityEvent

/**
 * @param listUpdated list API相关属性变更。
 * @param detailUpdated retrieve API相关属性变更。
 */
data class BookUpdated(override val bookId: Int,
                       val listUpdated: Boolean = false,
                       val detailUpdated: Boolean = false) : BaseBusEventImpl("entity/book/updated"), BookEntityEvent

data class BookDeleted(override val bookId: Int) : BaseBusEventImpl("entity/book/deleted"), BookEntityEvent

data class BookImagesChanged(val bookId: Int, val added: List<Int>, val moved: List<Int>, val deleted: List<Int>) : BaseBusEventImpl("entity/book/images/changed"), EntityEvent

interface FolderEntityEvent : EntityEvent { val folderId: Int }

data class FolderCreated(override val folderId: Int, val folderType: FolderType) : BaseBusEventImpl("entity/folder/created"), FolderEntityEvent

data class FolderUpdated(override val folderId: Int, val folderType: FolderType) : BaseBusEventImpl("entity/folder/updated"), FolderEntityEvent

data class FolderDeleted(override val folderId: Int, val folderType: FolderType) : BaseBusEventImpl("entity/folder/deleted"), FolderEntityEvent

data class FolderPinChanged(override val folderId: Int, val pin: Boolean, val pinOrdinal: Int?) : BaseBusEventImpl("entity/folder/pin/changed"), FolderEntityEvent

data class FolderImagesChanged(override val folderId: Int, val added: List<Int>, val moved: List<Int>, val deleted: List<Int>) : BaseBusEventImpl("entity/folder/images/changed"), FolderEntityEvent

interface ImportEntityEvent : EntityEvent { val importId: Int }

data class ImportCreated(override val importId: Int) : BaseBusEventImpl("entity/import/created"), ImportEntityEvent

/**
 * @param listUpdated list API相关属性变更。
 * @param detailUpdated retrieve API相关属性变更。
 * @param thumbnailFileReady 缩略图加载完毕。
 */
data class ImportUpdated(override val importId: Int,
                         val listUpdated: Boolean = false,
                         val detailUpdated: Boolean = false,
                         val timeSot: Boolean = false,
                         val thumbnailFileReady: Boolean = false) : BaseBusEventImpl("entity/import/updated"), ImportEntityEvent

data class ImportDeleted(override val importId: Int) : BaseBusEventImpl("entity/import/deleted"), ImportEntityEvent

data class ImportSaved(val importIdToImageIds: Map<Int, Int>) : BaseBusEventImpl("entity/import/saved"), EntityEvent

interface TrashedImageEntityEvent : EntityEvent { val imageId: Int }

data class TrashedImageCreated(override val imageId: Int) : BaseBusEventImpl("entity/trashed-image/created"), TrashedImageEntityEvent

data class TrashedImageProcessed(val imageIds: List<Int>, val restored: Boolean) : BaseBusEventImpl("entity/trashed-image/processed"), EntityEvent

interface SourceDataEntityEvent : EntityEvent { val site: String; val sourceId: Long }

data class SourceDataCreated(override val site: String, override val sourceId: Long, val sourceDataId: Int) : BaseBusEventImpl("entity/source-data/created"), SourceDataEntityEvent

data class SourceDataUpdated(override val site: String, override val sourceId: Long, val sourceDataId: Int) : BaseBusEventImpl("entity/source-data/updated"), SourceDataEntityEvent

data class SourceDataDeleted(override val site: String, override val sourceId: Long) : BaseBusEventImpl("entity/source-data/deleted"), SourceDataEntityEvent

data class SourceBookUpdated(val site: String, val sourceBookCode: String) : BaseBusEventImpl("entity/source-book/updated"), EntityEvent

data class SourceTagUpdated(val site: String, val sourceTagType: String, val sourceTagCode: String) : BaseBusEventImpl("entity/source-tag/updated"), EntityEvent

data class SourceTagMappingUpdated(val site: String, val sourceTagType: String, val sourceTagCode: String) : BaseBusEventImpl("entity/source-tag-mapping/updated"), EntityEvent

data class SimilarFinderResultCreated(val count: Int) : BaseBusEventImpl("entity/find-similar-result/created"), EntityEvent

data class SimilarFinderResultResolved(val resultId: Int) : BaseBusEventImpl("entity/find-similar-result/resolved"), EntityEvent

data class SimilarFinderResultDeleted(val resultId: Int) : BaseBusEventImpl("entity/find-similar-result/deleted"), EntityEvent

data class NoteCreated(val id: Int, val status: NoteStatus) : BaseBusEventImpl("entity/note/created"), EntityEvent

data class NoteUpdated(val id: Int, val status: NoteStatus, val deleted: Boolean) : BaseBusEventImpl("entity/note/updated"), EntityEvent

data class NoteDeleted(val id: Int, val status: NoteStatus, val deleted: Boolean) : BaseBusEventImpl("entity/note/deleted"), EntityEvent
