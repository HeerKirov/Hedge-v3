import { UsefulColors } from "@/constants/ui"
import { HttpInstance, Response } from "../instance"
import { IdResponse, LimitAndOffsetFilter, ListResult, mapFromOrderList, OrderList } from "./all"
import { SimpleAnnotation } from "./annotations"
import { MappingSourceTag, MappingSourceTagForm } from "./source-tag-mapping"
import { AlreadyExists, NotFound, ResourceNotExist, ResourceNotSuitable } from "../exceptions"

export function createAuthorEndpoint(http: HttpInstance): AuthorEndpoint {
    return {
        list: http.createQueryRequest("/api/authors", "GET", {
            parseQuery: mapFromAuthorFilter
        }),
        create: http.createDataRequest("/api/authors", "POST"),
        get: http.createPathRequest(id => `/api/authors/${id}`),
        update: http.createPathDataRequest(id => `/api/authors/${id}`, "PATCH"),
        delete: http.createPathRequest(id => `/api/authors/${id}`, "DELETE")
    }
}

function mapFromAuthorFilter(data: AuthorFilter): any {
    return {
        ...data,
        order: mapFromOrderList(data.order),
        annotationIds: data.annotationIds?.length ? data.annotationIds.join(",") : undefined
    }
}

/**
 * 作者。
 */
export interface AuthorEndpoint {
    /**
     * 查询作者列表。
     */
    list(filter: AuthorFilter): Promise<Response<ListResult<Author>>>
    /**
     * 新建作者。
     * @exception ALREADY_EXISTS ("Author", "name", name) 作者重名
     * @exception NOT_EXISTS ("annotations", id) 指定的资源不存在
     * @exception NOT_SUITABLE ("annotations", id) 指定的资源不适用。对于annotations，此注解的target要求不能应用于此种类的tag
     */
    create(form: AuthorCreateForm): Promise<Response<IdResponse, AuthorExceptions["create"]>>
    /**
     * 查看作者。
     * @exception NOT_FOUND
     */
    get(id: number): Promise<Response<DetailAuthor, NotFound>>
    /**
     * 更改作者。
     * @exception NOT_FOUND
     * @exception ALREADY_EXISTS ("Author", "name", name) 作者重名
     * @exception NOT_EXISTS ("annotations", id) 指定的资源不存在
     * @exception NOT_SUITABLE ("annotations", id) 指定的资源不适用。对于annotations，此注解的target要求不能应用于此种类的tag
     */
    update(id: number, form: AuthorUpdateForm): Promise<Response<null, AuthorExceptions["update"]>>
    /**
     * 删除作者。
     * @exception NOT_FOUND
     */
    delete(id: number): Promise<Response<null, NotFound>>
}

export interface AuthorExceptions {
    "create": AlreadyExists<"Author", "name", string> | ResourceNotExist<"annotations", number[]> | ResourceNotSuitable<"annotations", number[]> | ResourceNotExist<"site", string>
    "update": NotFound | AlreadyExists<"Author", "name", string> | ResourceNotExist<"annotations", number[]> | ResourceNotSuitable<"annotations", number[]> | ResourceNotExist<"site", string>
}

export type AuthorType = "UNKNOWN" | "ARTIST" | "STUDIO" | "PUBLISH"

export interface Author {
    /**
     * author id。
     */
    id: number
    /**
     * 作者名称。需要遵守tag name规范。
     */
    name: string
    /**
     * 其他名称。需要遵守tag name规范。
     */
    otherNames: string[]
    /**
     * 关键字。需要遵守tag name规范。
     */
    keywords: string[]
    /**
     * 作者类型。
     */
    type: AuthorType
    /**
     * 标记为收藏。
     */
    favorite: boolean
    /**
     * 注解。
     */
    annotations: SimpleAnnotation[]
    /**
     * 评分。
     */
    score: number | null
    /**
     * 关联的项目数量。
     */
    count: number
    /**
     * 此author的颜色。
     */
    color: UsefulColors | null
}

export interface DetailAuthor extends Author {
    /**
     * 描述。
     */
    description: string
    /**
     * 映射到此元数据的来源标签。
     */
    mappingSourceTags: MappingSourceTag[]
}

export interface SimpleAuthor {
    id: number
    name: string
    type: AuthorType
    color: UsefulColors | null
}

export interface RelatedSimpleAuthor extends SimpleAuthor {
    isExported: boolean
}

export interface AuthorCreateForm {
    name: string
    otherNames?: string[] | null
    type?: AuthorType
    description?: string
    keywords?: string[]
    annotations?: (string | number)[] | null
    favorite?: boolean
    score?: number | null
    mappingSourceTags?: MappingSourceTagForm[] | null
}

export interface AuthorUpdateForm {
    name?: string
    otherNames?: string[] | null
    type?: AuthorType
    description?: string
    keywords?: string[]
    annotations?: (string | number)[] | null
    favorite?: boolean
    score?: number | null
    mappingSourceTags?: MappingSourceTagForm[] | null
}

export type AuthorFilter = AuthorQueryFilter & LimitAndOffsetFilter

export interface AuthorQueryFilter {
    query?: string
    order?: OrderList<"id" | "name" | "score" | "count" | "createTime" | "updateTime">
    type?: AuthorType
    favorite?: boolean
    annotationIds?: number[]
}
