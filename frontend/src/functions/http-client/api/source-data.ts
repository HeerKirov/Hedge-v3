import { AlreadyExists, NotFound, ResourceNotExist } from "../exceptions"
import { HttpInstance, Response } from ".."
import { LimitAndOffsetFilter, ListResult, mapFromOrderList, OrderList } from "./all"
import { SimpleIllust } from "./illust"
import { datetime, LocalDateTime } from "@/utils/datetime"

export function createSourceDataEndpoint(http: HttpInstance): SourceDataEndpoint {
    return {
        list: http.createQueryRequest("/api/source-data", "GET", {
            parseQuery: mapFromSourceDataFilter,
            parseResponse: ({ total, result }: ListResult<any>) => ({total, result: result.map(mapToSourceData)})
        }),
        create: http.createDataRequest("/api/source-data", "POST"),
        bulk: http.createDataRequest("/api/source-data/bulk", "POST", {
            parseData: items => ({items})
        }),
        get: http.createPathRequest(({ sourceSite, sourceId }) => `/api/source-data/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceId)}`, "GET", {
            parseResponse: mapToDetailSourceData
        }),
        update: http.createPathDataRequest(({ sourceSite, sourceId }) => `/api/source-data/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceId)}`, "PATCH"),
        delete: http.createPathRequest(({ sourceSite, sourceId }) => `/api/source-data/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceId)}`, "DELETE"),
        getRelatedImages: http.createPathRequest(({ sourceSite, sourceId }) => `/api/source-data/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceId)}/related-images`)
    }
}

function mapToSourceData(data: any): SourceData {
    return {
        ...data,
        createTime: datetime.of(<string>data["createTime"]),
        updateTime: datetime.of(<string>data["updateTime"]),
    }
}

function mapToDetailSourceData(data: any): DetailSourceData {
    return {
        ...data,
        createTime: datetime.of(<string>data["createTime"]),
        updateTime: datetime.of(<string>data["updateTime"]),
    }
}

function mapFromSourceDataFilter(filter: SourceDataFilter): any {
    return {
        ...filter,
        order: mapFromOrderList(filter.order)
    }
}

export interface SourceDataEndpoint {
    list(filter: SourceDataFilter): Promise<Response<ListResult<SourceData>>>
    create(form: SourceDataCreateForm): Promise<Response<null, SourceDataExceptions["create"]>>
    bulk(items: SourceDataCreateForm[]): Promise<Response<null, SourceDataExceptions["bulk"]>>
    get(key: SourceDataIdentity): Promise<Response<DetailSourceData, NotFound>>
    getRelatedImages(key: SourceDataIdentity): Promise<Response<SimpleIllust[]>>
    update(key: SourceDataIdentity, form: SourceDataUpdateForm): Promise<Response<null, NotFound>>
    delete(key: SourceDataIdentity): Promise<Response<null, NotFound>>
}

interface SourceDataIdentity { sourceSite: string, sourceId: number }

export interface SourceDataExceptions {
    "create": ResourceNotExist<"site", string> | AlreadyExists<"SourceData", "sourceId", number>
    "bulk": ResourceNotExist<"site", string>
}

export type SourceEditStatus = "NOT_EDITED" | "EDITED" | "ERROR" | "IGNORED"

interface BasicSourceData {
    /**
     * source name???
     */
    sourceSite: string
    /**
     * source??????????????????setting??????????????????
     */
    sourceSiteName: string
    /**
     * source id???
     */
    sourceId: number
    /**
     * ???????????????
     */
    empty: boolean
    /**
     * ???????????????
     */
    status: SourceEditStatus
    /**
     * ???????????????
     */
    createTime: LocalDateTime
    /**
     * ???????????????
     */
    updateTime: LocalDateTime
}

export interface SourceData extends BasicSourceData {
    /**
     * tag?????????
     */
    tagCount: number
    /**
     * book?????????
     */
    bookCount: number
    /**
     * relation?????????
     */
    relationCount: number
}

export interface DetailSourceData extends BasicSourceData {
    /**
     * ?????????
     */
    title: string
    /**
     * ?????????
     */
    description: string
    /**
     * ?????????
     */
    tags: SourceTag[]
    /**
     * book???
     */
    books: SourceBook[]
    /**
     * ????????????
     */
    relations: number[]
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
}

export interface SourceDataCreateForm extends SourceDataUpdateForm {
    sourceSite: string
    sourceId: number
}

export interface SourceDataUpdateForm {
    status?: SourceEditStatus
    title?: string
    description?: string
    tags?: SourceTagForm[]
    books?: SourceBookForm[]
    relations?: number[]
}

export interface SourceTagForm {
    code: string
    name?: string
    otherName?: string
    type?: string
}

export interface SourceBookForm {
    code: string
    title?: string
}

export type SourceDataFilter = SourceDataQueryFilter & LimitAndOffsetFilter

export interface SourceDataQueryFilter {
    /**
     * ??????HQL???????????????list API????????????????????????
     */
    query?: string
    /**
     * ?????????????????????
     */
    order?: OrderList<"rowId" | "sourceId" | "site" | "createTime" | "updateTime">
    /**
     * ???source???????????????
     */
    source?: string
    /**
     * ???source tag?????????
     */
    sourceTag?: string
    /**
     * ????????????image id?????????
     */
    imageId?: number
}
