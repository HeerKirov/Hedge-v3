import { SimpleTag } from "./tag"
import { SimpleTopic } from "./topic"
import { SimpleAuthor } from "./author"

export type { SimpleTopic, SimpleTag, SimpleAuthor }

export type MetaTagTypeValue = {type: "tag", value: SimpleTag} | {type: "topic", value: SimpleTopic} | {type: "author", value: SimpleAuthor}

export type MetaTagTypes = MetaTagTypeValue["type"]

export type MetaTagValues = MetaTagTypeValue["value"]

export type MetaType = "TOPIC" | "AUTHOR" | "TAG"

export type IdentityType = "IMAGE" | "COLLECTION" | "BOOK"

export interface LimitFilter {
    limit?: number
}

export interface LimitAndOffsetFilter extends LimitFilter {
    offset?: number
}

export interface IdResponse {
    id: number
}

export interface IdResponseWithWarnings extends IdResponse {
    warnings: ErrorResult[]
}

export interface ListResult<T> {
    total: number
    result: T[]
}

export interface ErrorResult {
    code: string
    message: string | null
    info: any
}

export interface FilePath {
    original: string
    thumbnail: string
    sample: string
    extension: string
}

export interface NullableFilePath {
    original: string
    thumbnail: string | null
    sample: string | null
    extension: string
}

type OrderPrefix = "" | "+" | "-"

type OrderListItem<T extends string> = `${OrderPrefix}${T}`

export type OrderList<T extends string> = OrderListItem<T> | OrderListItem<T>[]

export function mapFromOrderList(orderList: OrderList<string> | null | undefined): string | undefined {
    return orderList == null ? undefined : typeof orderList === "object" ? (orderList.length ? orderList.join(",") : undefined) : orderList
}

export function mapListResult<T, R>(r: ListResult<T>, mapper: (t: T) => R): ListResult<R> {
    return {result: r.result.map(mapper), total: r.total}
}
