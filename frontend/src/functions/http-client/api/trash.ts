import { date, datetime, LocalDate, LocalDateTime } from "@/utils/datetime"
import { NotFound } from "../exceptions"
import { HttpInstance, Response } from "../instance"
import { FilePath, LimitAndOffsetFilter, ListResult, mapFromOrderList, OrderList, SimpleAuthor, SimpleTag, SimpleTopic, SourceDataPath } from "./all"
import { SimpleCollection, SimpleIllust, Tagme } from "./illust"
import { SimpleFolder } from "./folder"
import { SimpleBook } from "./book"

export function createTrashEndpoint(http: HttpInstance): TrashEndpoint {
    return {
        list: http.createQueryRequest("/api/trashes", "GET", { 
            parseQuery: mapFromTrashFilter, 
            parseResponse: ({ total, result }: ListResult<any>) => ({total, result: result.map(mapToTrashedImage)}) 
        }),
        get: http.createPathRequest(id => `/api/trashes/${id}`, "GET", { parseResponse: mapToDetailTrashedImage }),
        delete: http.createDataRequest("/api/trashes/delete", "POST"),
        restore: http.createDataRequest("/api/trashes/restore", "POST")
    }
}

function mapFromTrashFilter(filter: TrashFilter): any {
    return {
        ...filter,
        order: mapFromOrderList(filter.order)
    }
}

function mapToTrashedImage(data: any): TrashedImage {
    return {
        ...data,
        trashedTime: datetime.of(<string>data["trashedTime"]),
        orderTime: datetime.of(<string>data["orderTime"]),
    }
}

function mapToDetailTrashedImage(data: any): DetailTrashedImage {
    return {
        ...data,
        partitionTime: date.of(<string>data["partitionTime"]),
        orderTime: datetime.of(<string>data["orderTime"]),
        createTime: datetime.of(<string>data["createTime"]),
        updateTime: datetime.of(<string>data["updateTime"]),
        trashedTime: datetime.of(<string>data["trashedTime"]),
    }
}

/**
 * 已删除项目。
 */
export interface TrashEndpoint {
    /**
     * 查询所有已删除的项目。
     */
    list(filter: TrashFilter): Promise<Response<ListResult<TrashedImage>>>
    /**
     * 查看已删除项目。
     * @exception NOT_FOUND
     */
    get(id: number): Promise<Response<DetailTrashedImage, NotFound>>
    /**
     * 彻底删除已删除项目。
     */
    delete(imageIds: number[]): Promise<Response<unknown>>
    /**
     * 还原已删除项目。
     */
    restore(imageids: number[]): Promise<Response<unknown>>
}

export interface TrashedImage {
    id: number
    filePath: FilePath
    score: number | null
    favorite: boolean
    tagme: Tagme[]
    source: SourceDataPath | null
    orderTime: LocalDateTime
    trashedTime: LocalDateTime
    remainingTime: number | null
}

export interface DetailTrashedImage extends TrashedImage {
    extension: string
    size: number
    resolutionHeight: number
    resolutionWidth: number
    videoDuration: number
    topics: SimpleTopic[]
    authors: SimpleAuthor[]
    tags: SimpleTag[]
    collection: SimpleCollection | null
    books: SimpleBook[]
    folders: SimpleFolder[]
    associates: SimpleIllust[]
    description: string
    partitionTime: LocalDate
    createTime: LocalDateTime
    updateTime: LocalDateTime
}

export type TrashFilter = TrashQueryFilter & LimitAndOffsetFilter

export interface TrashQueryFilter {
    order?: OrderList<"id" | "trashedTime" | "orderTime">
}
