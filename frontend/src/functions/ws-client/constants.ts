import { ServerServiceStatus } from "@/functions/ipc-client"
import { MetaType } from "@/functions/http-client/api/all"
import { IllustType } from "@/functions/http-client/api/illust"
import { FolderType } from "@/functions/http-client/api/folder"
import { PathWatcherError } from "@/functions/http-client/api/import"

export interface BaseWsEvent<ET extends string> {
    eventType: ET
}

export type AllEventTypes = AllEvents["eventType"]

export type AllEvents = AppEvents | EntityEvents | BackendEvents | SettingEvents

type AppEvents = AppStatusChanged | HomepageStateChanged

type EntityEvents
    = AnnotationCreated | AnnotationUpdated | AnnotationDeleted
    | MetaTagCreated | MetaTagUpdated | MetaTagDeleted
    | IllustCreated | IllustUpdated | IllustDeleted | IllustSourceDataUpdated | IllustRelatedItemsUpdated | IllustImagesChanged
    | BookCreated | BookUpdated | BookDeleted | BookImagesChanged
    | FolderCreated | FolderUpdated | FolderDeleted | FolderPinChanged | FolderImagesChanged
    | ImportCreated | ImportUpdated | ImportDeleted | ImportSaved
    | TrashedImageCreated | TrashedImageProcessed
    | SourceDataCreated | SourceDataUpdated | SourceDataDeleted
    | SourceBookUpdated | SourceTagUpdated | SourceTagMappingUpdated
    | FindSimilarResultCreated | FindSimilarResultResolved | FindSimilarResultDeleted

type BackendEvents = PathWatcherStatusChanged 

type SettingEvents = SettingServiceChanged | SettingMetaChanged | SettingQueryChanged | SettingImportChanged | SettingFileChanged | SettingFindSimilarChanged | SettingSourceSiteChanged

//== App相关的系统通知 ==

export interface AppStatusChanged extends BaseWsEvent<"app/app-status/changed"> { status: ServerServiceStatus }

export interface HomepageStateChanged extends BaseWsEvent<"app/homepage/state/changed"> { }

//== 实体类相关的变更通知 ==

export interface AnnotationCreated extends BaseWsEvent<"entity/annotation/created"> { annotationId: number, type: MetaType }

export interface AnnotationUpdated extends BaseWsEvent<"entity/annotation/updated"> { annotationId: number, type: MetaType }

export interface AnnotationDeleted extends BaseWsEvent<"entity/annotation/deleted"> { annotationId: number, type: MetaType }

export interface MetaTagCreated extends BaseWsEvent<"entity/meta-tag/created"> { metaId: number, metaType: MetaType }

export interface MetaTagUpdated extends BaseWsEvent<"entity/meta-tag/updated"> { metaId: number, metaType: MetaType, listUpdated: boolean, detailUpdated: boolean, annotationSot: boolean, parentSot: boolean, sourceTagMappingSot: boolean }

export interface MetaTagDeleted extends BaseWsEvent<"entity/meta-tag/deleted"> { metaId: number, metaType: MetaType }

export interface IllustCreated extends BaseWsEvent<"entity/illust/created"> { illustId: number, illustType: IllustType }

export interface IllustUpdated extends BaseWsEvent<"entity/illust/updated"> { illustId: number, illustType: IllustType, listUpdated: boolean, detailUpdated: boolean, metaTagSot: boolean, descriptionSot: boolean, scoreSot: boolean, timeSot: boolean }

export interface IllustDeleted extends BaseWsEvent<"entity/illust/deleted"> { illustId: number, illustType: IllustType }

export interface IllustSourceDataUpdated extends BaseWsEvent<"entity/illust/source-data/updated"> { illustId: number }

export interface IllustRelatedItemsUpdated extends BaseWsEvent<"entity/illust/related-items/updated"> { illustId: number, illustType: IllustType, associateUpdated: boolean, folderUpdated: boolean, collectionUpdated: boolean, bookUpdated: boolean }

export interface IllustImagesChanged extends BaseWsEvent<"entity/illust/images/changed"> { illustId: number }

export interface BookCreated extends BaseWsEvent<"entity/book/created"> { bookId: number }

export interface BookUpdated extends BaseWsEvent<"entity/book/updated"> { bookId: number, listUpdated: boolean, detailUpdated: boolean }

export interface BookDeleted extends BaseWsEvent<"entity/book/deleted"> { bookId: number }

export interface BookImagesChanged extends BaseWsEvent<"entity/book/images/changed"> { bookId: number, added: number[], moved: number[], deleted: number[] }

export interface FolderCreated extends BaseWsEvent<"entity/folder/created"> { folderId: number, folderType: FolderType }

export interface FolderUpdated extends BaseWsEvent<"entity/folder/updated"> { folderId: number, folderType: FolderType }

export interface FolderDeleted extends BaseWsEvent<"entity/folder/deleted"> { folderId: number, folderType: FolderType }

export interface FolderPinChanged extends BaseWsEvent<"entity/folder/pin/changed"> { folderId: number, pin: boolean, pinOrdinal: number | null }

export interface FolderImagesChanged extends BaseWsEvent<"entity/folder/images/changed"> { folderId: number, added: number[], moved: number[], deleted: number[] }

export interface ImportCreated extends BaseWsEvent<"entity/import/created"> { importId: number }

export interface ImportUpdated extends BaseWsEvent<"entity/import/updated"> { importId: number, listUpdated: boolean, thumbnailFileReady: boolean }

export interface ImportDeleted extends BaseWsEvent<"entity/import/deleted"> { importId: number }

export interface ImportSaved extends BaseWsEvent<"entity/import/saved"> { importIdToImageIds: Record<number, number> }

export interface TrashedImageCreated extends BaseWsEvent<"entity/trashed-image/created"> { imageId: number }

export interface TrashedImageProcessed extends BaseWsEvent<"entity/trashed-image/processed"> { imageIds: number[], restore: boolean }

export interface SourceDataCreated extends BaseWsEvent<"entity/source-data/created"> { site: string, sourceId: number }

export interface SourceDataUpdated extends BaseWsEvent<"entity/source-data/updated"> { site: string, sourceId: number }

export interface SourceDataDeleted extends BaseWsEvent<"entity/source-data/deleted"> { site: string, sourceId: number }

export interface SourceBookUpdated extends BaseWsEvent<"entity/source-book/updated"> { site: string, sourceBookCode: string }

export interface SourceTagUpdated extends BaseWsEvent<"entity/source-tag/updated"> { site: string, sourceTagCode: string }

export interface SourceTagMappingUpdated extends BaseWsEvent<"entity/source-tag-mapping/updated"> { site: string, sourceTagCode: string }

export interface FindSimilarResultCreated extends BaseWsEvent<"entity/find-similar-result/created"> { count: number }

export interface FindSimilarResultResolved extends BaseWsEvent<"entity/find-similar-result/resolved"> { resultId: number }

export interface FindSimilarResultDeleted extends BaseWsEvent<"entity/find-similar-result/deleted"> { resultId: number }

//== backend后台相关变更通知 ==

export interface PathWatcherStatusChanged extends BaseWsEvent<"backend/path-watcher/status-changed"> { isOpen: boolean, statisticCount: number, errors: PathWatcherError[] }

//== setting相关变更通知 ==

export interface SettingServiceChanged extends BaseWsEvent<"setting/service/changed"> { }

export interface SettingMetaChanged extends BaseWsEvent<"setting/meta/changed"> { }

export interface SettingQueryChanged extends BaseWsEvent<"setting/query/changed"> { }

export interface SettingImportChanged extends BaseWsEvent<"setting/import/changed"> { }

export interface SettingFileChanged extends BaseWsEvent<"setting/file/changed"> { }

export interface SettingFindSimilarChanged extends BaseWsEvent<"setting/find-similar/changed"> { }

export interface SettingSourceSiteChanged extends BaseWsEvent<"setting/source-site/changed"> { }
