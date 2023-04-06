package com.heerkirov.hedge.server.events

import com.heerkirov.hedge.server.enums.FolderType
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.enums.MetaType

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
 * @param generalUpdated 普通属性的变更。
 * @param annotationUpdated 注解变更。
 * @param ordinalUpdated topic的parent变更、tag的parent/ordinal变更。
 * @param sourceTagMappingUpdated 与之相关的映射变更。
 */
data class MetaTagUpdated(override val metaId: Int, override val metaType: MetaType,
                          val generalUpdated: Boolean,
                          val annotationUpdated: Boolean,
                          val ordinalUpdated: Boolean,
                          val sourceTagMappingUpdated: Boolean) : BaseBusEventImpl("entity/meta-tag/updated"), MetaTagEntityEvent

data class MetaTagDeleted(override val metaId: Int, override val metaType: MetaType) : BaseBusEventImpl("entity/meta-tag/deleted"), MetaTagEntityEvent

interface IllustEntityEvent : EntityEvent { val illustId: Int; val illustType: IllustType }

data class IllustCreated(override val illustId: Int, override val illustType: IllustType) : BaseBusEventImpl("entity/illust/created"), IllustEntityEvent

/**
 * @param generalUpdated 普通属性变更，对于collection，这也包括file cover的变更等。
 * @param metaTagUpdated 标签变更。
 * @param sourceDataUpdated 来源数据变更。
 * @param relatedItemsUpdated 相关项目变更。
 */
data class IllustUpdated(override val illustId: Int, override val illustType: IllustType,
                         val generalUpdated: Boolean,
                         val metaTagUpdated: Boolean,
                         val sourceDataUpdated: Boolean,
                         val relatedItemsUpdated: Boolean) : BaseBusEventImpl("entity/illust/updated"), IllustEntityEvent

data class IllustDeleted(override val illustId: Int, override val illustType: IllustType) : BaseBusEventImpl("entity/illust/deleted"), IllustEntityEvent

data class CollectionImagesChanged(override val illustId: Int, override val illustType: IllustType = IllustType.COLLECTION) : BaseBusEventImpl("entity/collection-images/changed"), IllustEntityEvent

interface BookEntityEvent : EntityEvent { val bookId: Int }

data class BookCreated(override val bookId: Int) : BaseBusEventImpl("entity/book/created"), BookEntityEvent

/**
 * @param generalUpdated 普通属性变更，也包括封面变更等。
 * @param metaTagUpdated 标签变更。
 */
data class BookUpdated(override val bookId: Int,
                       val generalUpdated: Boolean,
                       val metaTagUpdated: Boolean) : BaseBusEventImpl("entity/book/updated"), BookEntityEvent

data class BookDeleted(override val bookId: Int) : BaseBusEventImpl("entity/book/deleted"), BookEntityEvent

data class BookImagesChanged(val bookId: Int, val added: List<Int>, val moved: List<Int>, val deleted: List<Int>) : BaseBusEventImpl("entity/book-images/changed"), EntityEvent

interface FolderEntityEvent : EntityEvent { val folderId: Int }

data class FolderCreated(override val folderId: Int, val folderType: FolderType) : BaseBusEventImpl("entity/folder/created"), FolderEntityEvent

data class FolderUpdated(override val folderId: Int, val folderType: FolderType) : BaseBusEventImpl("entity/folder/updated"), FolderEntityEvent

data class FolderDeleted(override val folderId: Int, val folderType: FolderType) : BaseBusEventImpl("entity/folder/deleted"), FolderEntityEvent

data class FolderPinChanged(override val folderId: Int, val pin: Boolean, val pinOrdinal: Int?) : BaseBusEventImpl("entity/folder-pin/changed"), FolderEntityEvent

data class FolderImagesChanged(override val folderId: Int, val added: List<Int>, val moved: List<Int>, val deleted: List<Int>) : BaseBusEventImpl("entity/folder-images/changed"), FolderEntityEvent

interface ImportEntityEvent : EntityEvent { val importId: Int }

data class ImportCreated(override val importId: Int) : BaseBusEventImpl("entity/import/created"), ImportEntityEvent

data class ImportUpdated(override val importId: Int,
                         val generalUpdated: Boolean,
                         val thumbnailFileReady: Boolean) : BaseBusEventImpl("entity/import/updated"), ImportEntityEvent

data class ImportDeleted(override val importId: Int) : BaseBusEventImpl("entity/import/deleted"), ImportEntityEvent

class ImportSaved(val count: Int) : BaseBusEventImpl("entity/import/saved"), EntityEvent

interface SourceDataEntityEvent : EntityEvent { val site: String; val sourceId: Long }

data class SourceDataCreated(override val site: String, override val sourceId: Long) : BaseBusEventImpl("entity/source-data/created"), SourceDataEntityEvent

data class SourceDataUpdated(override val site: String, override val sourceId: Long) : BaseBusEventImpl("entity/source-data/updated"), SourceDataEntityEvent

data class SourceDataDeleted(override val site: String, override val sourceId: Long) : BaseBusEventImpl("entity/source-data/deleted"), SourceDataEntityEvent

data class SourceBookUpdated(val site: String, val sourceBookCode: String) : BaseBusEventImpl("entity/source-book/updated"), EntityEvent

data class SourceTagUpdated(val site: String, val sourceTagCode: String) : BaseBusEventImpl("entity/source-tag/updated"), EntityEvent

data class SourceTagMappingUpdated(val site: String, val sourceTagCode: String) : BaseBusEventImpl("entity/source-tag-mapping/updated"), EntityEvent
