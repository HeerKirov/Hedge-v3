package com.heerkirov.hedge.server.events

import com.heerkirov.hedge.server.enums.FolderType
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.enums.MetaType

/**
 * 实体事件，指实体变更等。
 * 实体变更是指server中的entity发生新增、删除、属性变化、从属关系变化。当这些事情发生时，有通知前端以及部分响应组件的必要。
 */
interface EntityEvent

//TODO 在合适的位置发送这些事件

class AnnotationCreated(val annotationId: Int, val type: MetaType) : BaseBusEventImpl("entity/annotation/created"), EntityEvent

class AnnotationUpdated(val annotationId: Int, val type: MetaType) : BaseBusEventImpl("entity/annotation/updated"), EntityEvent

class AnnotationDeleted(val annotationId: Int, val type: MetaType) : BaseBusEventImpl("entity/annotation/deleted"), EntityEvent

class MetaTagCreated(val metaId: Int, val metaType: MetaType) : BaseBusEventImpl("entity/meta-tag/created"), EntityEvent

class MetaTagUpdated(val metaId: Int, val metaType: MetaType,
                     val generalUpdated: Boolean,
                     val ordinalUpdated: Boolean,
                     val sourceTagMappingUpdated: Boolean) : BaseBusEventImpl("entity/meta-tag/updated"), EntityEvent

class MetaTagDeleted(val metaId: Int, val metaType: MetaType) : BaseBusEventImpl("entity/meta-tag/deleted"), EntityEvent

class IllustCreated(val illustId: Int, val illustType: IllustType) : BaseBusEventImpl("entity/illust/created"), EntityEvent

class IllustUpdated(val illustId: Int, val illustType: IllustType,
                    val generalUpdated: Boolean,
                    val metaTagUpdated: Boolean,
                    val sourceDataUpdated: Boolean,
                    val relatedItemsUpdated: Boolean) : BaseBusEventImpl("entity/illust/updated"), EntityEvent

class IllustDeleted(val illustId: Int, val illustType: IllustType) : BaseBusEventImpl("entity/illust/deleted"), EntityEvent

class CollectionImagesChanged(val illustId: Int, val added: List<Int>, val deleted: List<Int>) : BaseBusEventImpl("entity/collection-images/changed"), EntityEvent

class BookCreated(val bookId: Int) : BaseBusEventImpl("entity/book/created"), EntityEvent

class BookUpdated(val bookId: Int,
                  val generalUpdated: Boolean,
                  val metaTagUpdated: Boolean) : BaseBusEventImpl("entity/book/updated"), EntityEvent

class BookDeleted(val bookId: Int) : BaseBusEventImpl("entity/book/deleted"), EntityEvent

class BookImagesChanged(val bookId: Int, val added: List<Int>, val moved: List<Int>, val deleted: List<Int>) : BaseBusEventImpl("entity/book-images/changed"), EntityEvent

class FolderCreated(val folderId: Int, val folderType: FolderType) : BaseBusEventImpl("entity/folder/created"), EntityEvent

class FolderUpdated(val folderId: Int, val folderType: FolderType) : BaseBusEventImpl("entity/folder/updated"), EntityEvent

class FolderDeleted(val folderId: Int, val folderType: FolderType) : BaseBusEventImpl("entity/folder/deleted"), EntityEvent

class FolderPinChanged(val folderId: Int, val folderType: FolderType, val pin: Boolean, val pinOrdinal: Int?) : BaseBusEventImpl("entity/folder-pin/changed"), EntityEvent

class FolderImagesChanged(val folderId: Int, val added: List<Int>, val moved: List<Int>, val deleted: List<Int>) : BaseBusEventImpl("entity/folder-images/changed"), EntityEvent

class ImportCreated(val importId: Int) : BaseBusEventImpl("entity/import/created"), EntityEvent

class ImportUpdated(val importId: Int,
                    val generalUpdated: Boolean,
                    val thumbnailFileReady: Boolean) : BaseBusEventImpl("entity/import/updated"), EntityEvent

class ImportDeleted(val importId: Int) : BaseBusEventImpl("entity/import/deleted"), EntityEvent

class ImportCountChanged : BaseBusEventImpl("entity/import/count-changed"), EntityEvent

class ImportSaved : BaseBusEventImpl("entity/import/saved"), EntityEvent

class SourceDataCreated(val site: String, val sourceId: Int) : BaseBusEventImpl("entity/source-data/created"), EntityEvent

class SourceDataUpdated(val site: String, val sourceId: Int) : BaseBusEventImpl("entity/source-data/updated"), EntityEvent

class SourceDataDeleted(val site: String, val sourceId: Int) : BaseBusEventImpl("entity/source-data/deleted"), EntityEvent

class SourceBookUpdated(val site: String, val sourceBookCode: String) : BaseBusEventImpl("entity/source-book/updated"), EntityEvent

class SourceTagUpdated(val site: String, val sourceTagCode: String) : BaseBusEventImpl("entity/source-tag/updated"), EntityEvent

class SourceTagMappingUpdated(val site: String, val sourceTagCode: String) : BaseBusEventImpl("entity/source-tag-mapping/updated"), EntityEvent
