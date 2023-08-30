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
        bulk: http.createDataRequest("/api/source-data/bulk", "POST"),
        get: http.createPathRequest(({ sourceSite, sourceId }) => `/api/source-data/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceId)}`, "GET", {
            parseResponse: mapToDetailSourceData
        }),
        update: http.createPathDataRequest(({ sourceSite, sourceId }) => `/api/source-data/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceId)}`, "PATCH"),
        delete: http.createPathRequest(({ sourceSite, sourceId }) => `/api/source-data/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceId)}`, "DELETE"),
        getRelatedImages: http.createPathRequest(({ sourceSite, sourceId }) => `/api/source-data/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceId)}/related-images`),
        getSourceMarks: http.createPathRequest(({ sourceSite, sourceId }) => `/api/source-data/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceId)}/source-marks`, "GET"),
        updateSourceMarks: http.createPathDataRequest(({ sourceSite, sourceId }) => `/api/source-data/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceId)}/source-marks`, "PATCH"),
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
    getSourceMarks(key: SourceDataIdentity): Promise<Response<SourceMark[], NotFound>>
    updateSourceMarks(key: SourceDataIdentity, form: SourceMarkPartialForm): Promise<Response<null, NotFound | ResourceNotExist<"related", number>>>
}

export interface SourceDataIdentity { sourceSite: string, sourceId: number }

export interface SourceDataExceptions {
    "create": ResourceNotExist<"site", string> | AlreadyExists<"SourceData", "sourceId", number>
    "bulk": ResourceNotExist<"site", string>
}

export type SourceMarkType = "SAME" | "SIMILAR" | "RELATED" | "UNKNOWN"

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
    /**
     * 相关链接。
     */
    links: string[]
    /**
     * 附加信息。
     */
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

export interface SourceMark {
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
     * 手动标记的关系类型。
     */
    markType: SourceMarkType
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
    links?: string[]
    additionalInfo?: SourceAdditionalInfoForm[]
}

export interface SourceTagForm {
    code: string
    name?: string
    otherName?: string | null
    type?: string | null
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

export interface SourceMarkPartialForm {
    action: "UPSERT" | "REMOVE"
    sourceSite: string
    sourceId: number
    markType?: SourceMarkType
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
     * 按status类型过滤。
     */
    status?: SourceEditStatus[]
    /**
     * 按source site类型过滤。
     */
    site?: string[]
    /**
     * 按source tag过滤。
     */
    sourceTag?: string
    /**
     * 按关联的image id过滤。
     */
    imageId?: number
}
