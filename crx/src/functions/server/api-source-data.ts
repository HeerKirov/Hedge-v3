import { LimitAndOffsetFilter, ListResult, OrderList, SimpleIllust, SourceDataPath, mapFromOrderList } from "./api-all"
import { createDataRequest, createPathDataRequest, createPathRequest, createQueryRequest } from "./impl"
import { AlreadyExists, BasicException, NotFound, ResourceNotExist } from "./exceptions"

export const sourceData = {
    list: createQueryRequest<SourceDataFilter, ListResult<SourceData>, never>("/api/source-data", "GET", {
        parseQuery: mapFromSourceDataFilter
    }),
    create: createDataRequest<SourceDataCreateForm, null, ResourceNotExist<"site", string> | AlreadyExists<"SourceData", "sourceId", number>>("/api/source-data", "POST"),
    bulk: createDataRequest<SourceDataCreateForm[], BulkResult<SourceDataIdentity, ResourceNotExist<"site", string> | ResourceNotExist<"additionalInfo", string> | ResourceNotExist<"sourceTagType", string[]>>, ResourceNotExist<"site", string> | ResourceNotExist<"additionalInfo", string> | ResourceNotExist<"sourceTagType", string[]>>("/api/source-data/bulk", "POST"),
    get: createPathRequest<SourceDataIdentity, DetailSourceData, NotFound>(({ sourceSite, sourceId }) => `/api/source-data/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceId)}`, "GET"),
    update: createPathDataRequest<SourceDataIdentity, SourceDataUpdateForm, null, NotFound>(({ sourceSite, sourceId }) => `/api/source-data/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceId)}`, "PATCH"),
    delete: createPathRequest<SourceDataIdentity, null, NotFound>(({ sourceSite, sourceId }) => `/api/source-data/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceId)}`, "DELETE"),
    getRelatedImages: createPathRequest<SourceDataIdentity, SimpleIllust[], NotFound>(({ sourceSite, sourceId }) => `/api/source-data/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceId)}/related-images`),
    getCollectStatus: createDataRequest<SourceDataPath[], SourceDataCollectStatus[], never>("/api/source-data/collect-status", "POST")
}

function mapFromSourceDataFilter(filter: SourceDataFilter): any {
    return {
        ...filter,
        order: mapFromOrderList(filter.order)
    }
}

export interface SourceDataIdentity { sourceSite: string, sourceId: string }

export type SourceEditStatus = "NOT_EDITED" | "EDITED" | "ERROR" | "IGNORED"

interface BasicSourceData {
    sourceSite: string
    sourceSiteName: string
    sourceId: string
    empty: boolean
    status: SourceEditStatus
    publishTime: string
    createTime: string
    updateTime: string
}

export interface SourceData extends BasicSourceData {
    tagCount: number
    bookCount: number
    relationCount: number
}

export interface DetailSourceData extends BasicSourceData {
    title: string
    description: string
    tags: SourceTag[]
    books: SourceBook[]
    relations: number[]
    links: string[]
    additionalInfo: SourceAdditionalInfo[]
}

export interface SourceTag {
    code: string
    name: string
    otherName: string | null
    type: string | null
}

export interface SourceBook {
    code: string
    title: string
    otherTitle: string | null
}

export interface SourceAdditionalInfo {
    field: string
    label: string
    value: string
}

export interface SourceDataCollectStatus {
    source: SourceDataPath
    imageCount: number
    imageInDiffIdCount: number
    collected: boolean
    collectStatus: SourceEditStatus | null
    collectTime: string | null
}

export interface SourceDataCreateForm extends SourceDataUpdateForm {
    sourceSite: string
    sourceId: string
}

export interface SourceDataUpdateForm {
    status?: SourceEditStatus
    title?: string
    description?: string
    tags?: SourceTagForm[]
    books?: SourceBookForm[]
    relations?: number[]
    links?: string[]
    additionalInfo?: SourceAdditionalInfoForm[]
    publishTime?: string
}

export interface SourceTagForm {
    code: string
    type: string
    name?: string
    otherName?: string | null
}

export interface SourceBookForm {
    code: string
    title?: string
    otherTitle?: string | null
}

export interface SourceAdditionalInfoForm {
    field: string
    value: string
}

export interface BulkResult<I, E extends BasicException> {
    success: number
    failed: number
    errors: {target: I, error: E}[]
}

export type SourceDataFilter = SourceDataQueryFilter & LimitAndOffsetFilter

export interface SourceDataQueryFilter {
    query?: string
    order?: OrderList<"rowId" | "sourceId" | "site" | "createTime" | "updateTime">
    status?: SourceEditStatus[]
    site?: string[]
    sourceTag?: string
    imageId?: number
}
