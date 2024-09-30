
export interface IdResponse {
    id: number
}

export interface ListResult<T> {
    total: number
    result: T[]
}

export interface LimitFilter {
    limit?: number
}

export interface LimitAndOffsetFilter extends LimitFilter {
    offset?: number
}

export interface SimpleBook {
    id: number
    title: string
    filePath: FilePath | null
}

export interface SimpleFolder {
    id: number
    address: string[]
    type: "NODE" | "FOLDER"
}

export interface SimpleAuthor {
    id: number
    name: string
    type: string
    color: string | null
}

export interface SimpleTopic {
    id: number
    name: string
    type: string
    color: string | null
}

export interface SimpleTag {
    id: number
    name: string
    color: string | null
}

export interface RelatedSimpleAuthor extends SimpleAuthor {
    isExported: boolean
}

export interface RelatedSimpleTopic extends SimpleTopic {
    isExported: boolean
}

export interface RelatedSimpleTag extends SimpleTag {
    isExported: boolean
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

export interface SourceDataPath {
    sourceSite: string
    sourceId: string
    sourcePart: number | null
    sourcePartName: string | null
}

export interface SourceTagPath {
    sourceSite: string
    sourceTagType: string
    sourceTagCode: string
}

type OrderPrefix = "" | "+" | "-"

type OrderListItem<T extends string> = `${OrderPrefix}${T}`

export type OrderList<T extends string> = OrderListItem<T> | OrderListItem<T>[]

export function mapFromOrderList(orderList: OrderList<string> | null | undefined): string | undefined {
    return orderList === null || orderList === undefined ? undefined : typeof orderList === "object" ? (orderList.length ? orderList.join(",") : undefined) : orderList
}

export function mapListResult<T, R>(r: ListResult<T>, mapper: (t: T) => R): ListResult<R> {
    return {result: r.result.map(mapper), total: r.total}
}
