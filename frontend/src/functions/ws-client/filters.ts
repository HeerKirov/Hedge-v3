import { AllEvents } from "@/functions/ws-client/constants"
import { MetaType } from "@/functions/http-client/api/all"

export const wsEventFilters = {
    app: {
        appStatus: {
            changed: () => (e: AllEvents) => e.eventType === "app/app-status/changed"
        }
    },
    entity: {
        annotation: {
            created: (annotationId?: number) => (e: AllEvents) => e.eventType === "entity/annotation/created" && (annotationId === undefined || e.annotationId === annotationId),
            updated: (annotationId?: number) => (e: AllEvents) => e.eventType === "entity/annotation/updated" && (annotationId === undefined || e.annotationId === annotationId),
            deleted: (annotationId?: number) => (e: AllEvents) => e.eventType === "entity/annotation/deleted" && (annotationId === undefined || e.annotationId === annotationId),
        },
        metaTag: {
            created: (metaType?: MetaType, metaId?: number) => (e: AllEvents) => e.eventType === "entity/meta-tag/created" && (metaType === undefined || e.metaType === metaType) && (metaId === undefined || e.metaId === metaId),
            updated: (metaType?: MetaType, metaId?: number) => (e: AllEvents) => e.eventType === "entity/meta-tag/updated" && (metaType === undefined || e.metaType === metaType) && (metaId === undefined || e.metaId === metaId),
            deleted: (metaType?: MetaType, metaId?: number) => (e: AllEvents) => e.eventType === "entity/meta-tag/deleted" && (metaType === undefined || e.metaType === metaType) && (metaId === undefined || e.metaId === metaId),
        },
        illust: {
            created: (illustId?: number) => (e: AllEvents) => e.eventType === "entity/illust/created" && (illustId === undefined || e.illustId === illustId),
            updated: (illustId?: number) => (e: AllEvents) => e.eventType === "entity/illust/updated" && (illustId === undefined || e.illustId === illustId),
            deleted: (illustId?: number) => (e: AllEvents) => e.eventType === "entity/illust/deleted" && (illustId === undefined || e.illustId === illustId),
            imagesChanged: (collectionId?: number) => (e: AllEvents) => e.eventType === "entity/collection-images/changed" && (collectionId === undefined || e.illustId === collectionId),
        },
        book: {
            created: (bookId?: number) => (e: AllEvents) => e.eventType === "entity/book/created" && (bookId === undefined || e.bookId === bookId),
            updated: (bookId?: number) => (e: AllEvents) => e.eventType === "entity/book/updated" && (bookId === undefined || e.bookId === bookId),
            deleted: (bookId?: number) => (e: AllEvents) => e.eventType === "entity/book/deleted" && (bookId === undefined || e.bookId === bookId),
            imagesChanged: (bookId?: number) => (e: AllEvents) => e.eventType === "entity/book-images/changed" && (bookId === undefined || e.bookId === bookId),
        },
        folder: {
            created: (folderId?: number) => (e: AllEvents) => e.eventType === "entity/folder/created" && (folderId === undefined || e.folderId === folderId),
            updated: (folderId?: number) => (e: AllEvents) => e.eventType === "entity/folder/updated" && (folderId === undefined || e.folderId === folderId),
            deleted: (folderId?: number) => (e: AllEvents) => e.eventType === "entity/folder/deleted" && (folderId === undefined || e.folderId === folderId),
            imagesChanged: (folderId?: number) => (e: AllEvents) => e.eventType === "entity/folder-images/changed" && (folderId === undefined || e.folderId === folderId),
            pinChanged: (folderId?: number) => (e: AllEvents) => e.eventType === "entity/folder-pin/changed" && (folderId === undefined || e.folderId === folderId),
        },
        import: {
            created: (importId?: number) => (e: AllEvents) => e.eventType === "entity/import/created" && (importId === undefined || e.importId === importId),
            updated: (importId?: number) => (e: AllEvents) => e.eventType === "entity/import/updated" && (importId === undefined || e.importId === importId),
            deleted: (importId?: number) => (e: AllEvents) => e.eventType === "entity/import/deleted" && (importId === undefined || e.importId === importId),
            saved: () => (e: AllEvents) => e.eventType === "entity/import/saved",
        },
        sourceData: {
            created: (site?: string, sourceId?: number) => (e: AllEvents) => e.eventType === "entity/source-data/created" && (site === undefined || site === e.site) && (sourceId === undefined || sourceId === e.sourceId),
            updated: (site?: string, sourceId?: number) => (e: AllEvents) => e.eventType === "entity/source-data/updated" && (site === undefined || site === e.site) && (sourceId === undefined || sourceId === e.sourceId),
            deleted: (site?: string, sourceId?: number) => (e: AllEvents) => e.eventType === "entity/source-data/deleted" && (site === undefined || site === e.site) && (sourceId === undefined || sourceId === e.sourceId),
        },
        sourceBook: {
            updated: (site?: string, code?: string) => (e: AllEvents) => e.eventType === "entity/source-book/updated" && (site === undefined || site === e.site) && (code === undefined || code === e.sourceBookCode),
        },
        sourceTag: {
            updated: (site?: string, code?: string) => (e: AllEvents) => e.eventType === "entity/source-tag/updated" && (site === undefined || site === e.site) && (code === undefined || code === e.sourceTagCode),
        },
        sourceTagMapping: {
            updated: (site?: string, code?: string) => (e: AllEvents) => e.eventType === "entity/source-tag-mapping/updated" && (site === undefined || site === e.site) && (code === undefined || code === e.sourceTagCode),
        }
    },
    setting: {
        service: {
            changed: () => (e: AllEvents) => e.eventType === "setting/service/changed"
        },
        meta: {
            changed: () => (e: AllEvents) => e.eventType === "setting/meta/changed"
        },
        query: {
            changed: () => (e: AllEvents) => e.eventType === "setting/query/changed"
        },
        import: {
            changed: () => (e: AllEvents) => e.eventType === "setting/import/changed"
        },
        findSimilar: {
            changed: () => (e: AllEvents) => e.eventType === "setting/find-similar/changed"
        },
        sourceSite: {
            changed: () => (e: AllEvents) => e.eventType === "setting/source-site/changed"
        },
    }
} as const
