import { ServerServiceStatus } from "@/functions/ipc-client"
import { MetaType } from "@/functions/http-client/api/all"
import { IllustType } from "@/functions/http-client/api/illust"
import { FolderType } from "@/functions/http-client/api/folder";
import { ServiceOptionUpdateForm } from "@/functions/http-client/api/setting-service";
import { MetaOptionUpdateForm } from "@/functions/http-client/api/setting-meta";
import { QueryOptionUpdateForm } from "@/functions/http-client/api/setting-query";
import { ImportOptionUpdateForm } from "@/functions/http-client/api/setting-import";
import { FindSimilarOptionUpdateForm } from "@/functions/http-client/api/setting-find-similar";
import { Site } from "@/functions/http-client/api/setting-source";

export interface BaseWsEvent<ET extends string> {
    eventType: ET
}

export type AllEventTypes = AllEvents["eventType"]

export type AllEvents = AppEvents | EntityEvents | SettingEvents

type AppEvents = AppStatusChanged

type EntityEvents
    = AnnotationCreated | AnnotationUpdated | AnnotationDeleted
    | MetaTagCreated | MetaTagUpdated | MetaTagDeleted
    | IllustCreated | IllustUpdated | IllustDeleted | CollectionImagesChanged
    | BookCreated | BookUpdated | BookDeleted | BookImagesChanged
    | FolderCreated | FolderUpdated | FolderDeleted | FolderPinChanged | FolderImagesChanged
    | ImportCreated | ImportUpdated | ImportDeleted | ImportSaved
    | SourceDataCreated | SourceDataUpdated | SourceDataDeleted
    | SourceBookUpdated | SourceTagUpdated | SourceTagMappingUpdated

type SettingEvents = SettingServiceChanged | SettingMetaChanged | SettingQueryChanged | SettingImportChanged | SettingFindSimilarChanged | SettingSourceSiteChanged

//== App相关的系统通知 ==

export interface AppStatusChanged extends BaseWsEvent<"app/app-status/changed"> { status: ServerServiceStatus }

//== 实体类相关的变更通知 ==

export interface AnnotationCreated extends BaseWsEvent<"entity/annotation/created"> { annotationId: number, metaType: MetaType }

export interface AnnotationUpdated extends BaseWsEvent<"entity/annotation/updated"> { annotationId: number, metaType: MetaType }

export interface AnnotationDeleted extends BaseWsEvent<"entity/annotation/deleted"> { annotationId: number, metaType: MetaType }

export interface MetaTagCreated extends BaseWsEvent<"entity/meta-tag/created"> { metaId: number, metaType: MetaType }

export interface MetaTagUpdated extends BaseWsEvent<"entity/meta-tag/updated"> { metaId: number, metaType: MetaType, generalUpdated: boolean, annotationUpdated: boolean, ordinalUpdated: boolean, sourceTagMappingUpdated: boolean }

export interface MetaTagDeleted extends BaseWsEvent<"entity/meta-tag/deleted"> { metaId: number, metaType: MetaType }

export interface IllustCreated extends BaseWsEvent<"entity/illust/created"> { illustId: number, illustType: IllustType }

export interface IllustUpdated extends BaseWsEvent<"entity/illust/updated"> { illustId: number, illustType: IllustType, generalUpdated: boolean, metaTagUpdated: boolean, sourceDataUpdated: boolean, relatedItemsUpdated: boolean }

export interface IllustDeleted extends BaseWsEvent<"entity/illust/deleted"> { illustId: number, illustType: IllustType }

export interface CollectionImagesChanged extends BaseWsEvent<"entity/collection-images/changed"> { illustId: number }

export interface BookCreated extends BaseWsEvent<"entity/book/created"> { bookId: number }

export interface BookUpdated extends BaseWsEvent<"entity/book/updated"> { bookId: number, generalUpdated: boolean, metaTagUpdated: boolean }

export interface BookDeleted extends BaseWsEvent<"entity/book/deleted"> { bookId: number }

export interface BookImagesChanged extends BaseWsEvent<"entity/book-images/changed"> { bookId: number, added: number[], moved: number[], deleted: number[] }

export interface FolderCreated extends BaseWsEvent<"entity/folder/created"> { folderId: number, folderType: FolderType }

export interface FolderUpdated extends BaseWsEvent<"entity/folder/updated"> { folderId: number, folderType: FolderType, generalUpdated: boolean, metaTagUpdated: boolean }

export interface FolderDeleted extends BaseWsEvent<"entity/folder/deleted"> { folderId: number, folderType: FolderType }

export interface FolderPinChanged extends BaseWsEvent<"entity/folder-pin/changed"> { folderId: number, pin: boolean, pinOrdinal: number | null }

export interface FolderImagesChanged extends BaseWsEvent<"entity/folder-images/changed"> { folderId: number, added: number[], moved: number[], deleted: number[] }

export interface ImportCreated extends BaseWsEvent<"entity/import/created"> { importId: number }

export interface ImportUpdated extends BaseWsEvent<"entity/import/updated"> { importId: number, generalUpdated: boolean, thumbnailFileReady: boolean }

export interface ImportDeleted extends BaseWsEvent<"entity/import/deleted"> { importId: number }

export interface ImportSaved extends BaseWsEvent<"entity/import/saved"> { }

export interface SourceDataCreated extends BaseWsEvent<"entity/source-data/created"> { site: string, sourceId: number }

export interface SourceDataUpdated extends BaseWsEvent<"entity/source-data/updated"> { site: string, sourceId: number }

export interface SourceDataDeleted extends BaseWsEvent<"entity/source-data/deleted"> { site: string, sourceId: number }

export interface SourceBookUpdated extends BaseWsEvent<"entity/source-book/updated"> { site: string, sourceBookCode: string }

export interface SourceTagUpdated extends BaseWsEvent<"entity/source-tag/updated"> { site: string, sourceTagCode: string }

export interface SourceTagMappingUpdated extends BaseWsEvent<"entity/source-tag-mapping/updated"> { site: string, sourceTagCode: string }

//== setting相关变更通知 ==

export interface SettingServiceChanged extends BaseWsEvent<"setting/service/changed"> { serviceOption: ServiceOptionUpdateForm }

export interface SettingMetaChanged extends BaseWsEvent<"setting/meta/changed"> { metaOption: MetaOptionUpdateForm }

export interface SettingQueryChanged extends BaseWsEvent<"setting/query/changed"> { queryOption: QueryOptionUpdateForm }

export interface SettingImportChanged extends BaseWsEvent<"setting/import/changed"> { importOption: ImportOptionUpdateForm }

export interface SettingFindSimilarChanged extends BaseWsEvent<"setting/find-similar/changed"> { findSimilarOption: FindSimilarOptionUpdateForm }

export interface SettingSourceSiteChanged extends BaseWsEvent<"setting/source-site/changed"> { sites: Site[] }
