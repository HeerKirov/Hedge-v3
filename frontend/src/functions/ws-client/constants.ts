import { ServerServiceStatus } from "@/functions/ipc-client"
import { BackgroundTaskType } from "@/functions/http-client/api/homepage"
import { MetaType } from "@/functions/http-client/api/all"
import { IllustType } from "@/functions/http-client/api/illust"
import { FolderType } from "@/functions/http-client/api/folder"
import { ImportStatus } from "@/functions/http-client/api/import"
import { NoteStatus } from "@/functions/http-client/api/note"

export interface BaseWsEvent<ET extends string> { eventType: ET }

export type AllEventTypes = AllEvents["eventType"]

export type AllEvents = AppEvents | EntityEvents | SettingEvents

type AppEvents = AppStatusChanged | HomepageStateChanged | QuickFindChanged | StagingPostChanged | BackgroundTaskChanged

type EntityEvents
    = MetaTagCreated | MetaTagUpdated | MetaTagDeleted
    | IllustCreated | IllustUpdated | IllustDeleted | IllustSourceDataUpdated | IllustRelatedItemsUpdated | IllustImagesChanged
    | BookCreated | BookUpdated | BookDeleted | BookImagesChanged
    | FolderCreated | FolderUpdated | FolderDeleted | FolderPinChanged | FolderImagesChanged
    | ImportCreated | ImportUpdated | ImportDeleted
    | TrashedImageCreated | TrashedImageProcessed
    | SourceDataCreated | SourceDataUpdated | SourceDataDeleted
    | SourceBookUpdated | SourceTagUpdated | SourceTagMappingUpdated
    | FindSimilarResultCreated | FindSimilarResultUpdated | FindSimilarResultDeleted
    | NoteCreated | NoteUpdated | NoteDeleted

type SettingEvents = SettingServerChanged | SettingMetaChanged | SettingQueryChanged | SettingImportChanged | SettingStorageChanged | SettingFindSimilarChanged | SettingSourceSiteChanged

//== App相关的系统通知 ==

export interface AppStatusChanged extends BaseWsEvent<"app/app-status/changed"> { status: ServerServiceStatus }

export interface HomepageStateChanged extends BaseWsEvent<"app/homepage/state/changed"> { }

export interface StagingPostChanged extends BaseWsEvent<"app/staging-post/changed"> { added: number[], moved: number[], deleted: number[] }

export interface QuickFindChanged extends BaseWsEvent<"app/quick-find/changed"> { id: number }

export interface BackgroundTaskChanged extends BaseWsEvent<"app/background-task/changed"> { type: BackgroundTaskType, currentValue: number, maxValue: number }

//== 实体类相关的变更通知 ==

export interface MetaTagCreated extends BaseWsEvent<"entity/meta-tag/created"> { metaId: number, metaType: MetaType }

export interface MetaTagUpdated extends BaseWsEvent<"entity/meta-tag/updated"> { metaId: number, metaType: MetaType, listUpdated: boolean, detailUpdated: boolean, parentSot: boolean, sourceTagMappingSot: boolean }

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

export interface ImportUpdated extends BaseWsEvent<"entity/import/updated"> { importId: number, status: ImportStatus, thumbnailFileError: boolean | null, fingerprintError: boolean | null, sourceAnalyseError: boolean | null, sourceAnalyseNone: boolean | null }

export interface ImportDeleted extends BaseWsEvent<"entity/import/deleted"> { importId: number }

export interface TrashedImageCreated extends BaseWsEvent<"entity/trashed-image/created"> { imageId: number }

export interface TrashedImageProcessed extends BaseWsEvent<"entity/trashed-image/processed"> { imageIds: number[], restore: boolean }

export interface SourceDataCreated extends BaseWsEvent<"entity/source-data/created"> { site: string, sourceId: string }

export interface SourceDataUpdated extends BaseWsEvent<"entity/source-data/updated"> { site: string, sourceId: string }

export interface SourceDataDeleted extends BaseWsEvent<"entity/source-data/deleted"> { site: string, sourceId: string }

export interface SourceBookUpdated extends BaseWsEvent<"entity/source-book/updated"> { site: string, sourceBookCode: string }

export interface SourceTagUpdated extends BaseWsEvent<"entity/source-tag/updated"> { site: string, sourceTagType: string, sourceTagCode: string }

export interface SourceTagMappingUpdated extends BaseWsEvent<"entity/source-tag-mapping/updated"> { site: string, sourceTagType: string, sourceTagCode: string }

export interface FindSimilarResultCreated extends BaseWsEvent<"entity/find-similar-result/created"> { count: number }

export interface FindSimilarResultUpdated extends BaseWsEvent<"entity/find-similar-result/updated"> { resultId: number }

export interface FindSimilarResultDeleted extends BaseWsEvent<"entity/find-similar-result/deleted"> { resultId: number }

export interface NoteCreated extends BaseWsEvent<"entity/note/created"> { id: number, status: NoteStatus }

export interface NoteUpdated extends BaseWsEvent<"entity/note/updated"> { id: number, status: NoteStatus, deleted: boolean }

export interface NoteDeleted extends BaseWsEvent<"entity/note/deleted"> { id: number, status: NoteStatus, deleted: boolean }


//== setting相关变更通知 ==

export interface SettingServerChanged extends BaseWsEvent<"setting/server/changed"> { }

export interface SettingMetaChanged extends BaseWsEvent<"setting/meta/changed"> { }

export interface SettingQueryChanged extends BaseWsEvent<"setting/query/changed"> { }

export interface SettingImportChanged extends BaseWsEvent<"setting/import/changed"> { }

export interface SettingStorageChanged extends BaseWsEvent<"setting/storage/changed"> { }

export interface SettingFindSimilarChanged extends BaseWsEvent<"setting/find-similar/changed"> { }

export interface SettingSourceSiteChanged extends BaseWsEvent<"setting/source-site/changed"> { }
