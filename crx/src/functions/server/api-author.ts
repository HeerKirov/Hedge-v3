import { LimitAndOffsetFilter, ListResult, OrderList, mapFromOrderList } from "./api-all"
import { createQueryRequest } from "./impl"

export const author = {
    list: createQueryRequest<AuthorFilter, ListResult<Author>, never>("/api/authors", "GET", {
        parseQuery: mapFromAuthorFilter
    })
}

function mapFromAuthorFilter(filter: AuthorFilter): any {
    return {
        ...filter,
        order: mapFromOrderList(filter.order)
    }
}

export type AuthorType = "UNKNOWN" | "ARTIST" | "GROUP" | "SERIES"

export interface Author {
    id: number
    name: string
    otherNames: string[]
    keywords: string[]
    type: AuthorType
    favorite: boolean
    score: number | null
    count: number
    color: string | null
}

export type AuthorFilter = AuthorQueryFilter & LimitAndOffsetFilter

export interface AuthorQueryFilter {
    query?: string
    order?: OrderList<"id" | "name" | "score" | "count" | "createTime" | "updateTime">
    type?: AuthorType
    favorite?: boolean
}
