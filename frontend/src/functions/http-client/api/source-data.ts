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
    get(key: SourceKey): Promise<Response<DetailSourceData, NotFound>>
    getRelatedImages(key: SourceKey): Promise<Response<SimpleIllust[]>>
    update(key: SourceKey, form: SourceDataUpdateForm): Promise<Response<null, NotFound>>
    delete(key: SourceKey): Promise<Response<null, NotFound>>
}

interface SourceKey { sourceSite: string, sourceId: number }

export interface SourceDataExceptions {
    "create": ResourceNotExist<"site", string> | AlreadyExists<"SourceData", "sourceId", number>
    "bulk": ResourceNotExist<"site", string>
}

export type SourceEditStatus = "NOT_EDITED" | "EDITED" | "ERROR" | "IGNORED"

interface BasicSourceData {
    /**
     * source name。
     */
    sourceSite: string
    /**
     * source标题。自动从setting取得并填充。
     */
    sourceSiteName: string
    /**
     * source id。
     */
    sourceId: number
    /**
     * 是否为空。
     */
    empty: boolean
    /**
     * 编辑状态。
     */
    status: SourceEditStatus
    /**
     * 创建时间。
     */
    createTime: LocalDateTime
    /**
     * 更改时间。
     */
    updateTime: LocalDateTime
}

export interface SourceData extends BasicSourceData {
    /**
     * tag数量。
     */
    tagCount: number
    /**
     * book数量。
     */
    bookCount: number
    /**
     * relation数量。
     */
    relationCount: number
}

export interface DetailSourceData extends BasicSourceData {
    /**
     * 标题。
     */
    title: string
    /**
     * 描述。
     */
    description: string
    /**
     * 标签。
     */
    tags: SourceTag[]
    /**
     * book。
     */
    books: SourceBook[]
    /**
     * 相关项。
     */
    relations: number[]
}

export interface SourceTag {
    code: string
    name: string
    displayName: string | null
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
     * 使用HQL进行查询。list API不提示解析结果。
     */
    query?: string
    /**
     * 排序字段列表。
     */
    order?: OrderList<"rowId" | "sourceId" | "site" | "createTime" | "updateTime">
    /**
     * 按source类型过滤。
     */
    source?: string
    /**
     * 按source tag过滤。
     */
    sourceTag?: string
    /**
     * 按关联的image id过滤。
     */
    imageId?: number
}
