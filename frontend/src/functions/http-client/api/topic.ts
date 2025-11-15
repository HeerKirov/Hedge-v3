import { UsefulColors } from "@/constants/ui"
import { HttpInstance, Response } from "../instance"
import { ExportType, IdResponse, LimitAndOffsetFilter, ListResult, mapFromOrderList, OrderList } from "./all"
import { MappingSourceTag, MappingSourceTagForm } from "./source-tag-mapping"
import { AlreadyExists, IllegalConstraintError, NotFound, RecursiveParentError, ResourceNotExist } from "../exceptions"

export function createTopicEndpoint(http: HttpInstance): TopicEndpoint {
    return {
        list: http.createQueryRequest("/api/topics", "GET", {
            parseQuery: mapFromTopicFilter
        }),
        create: http.createDataRequest("/api/topics", "POST"),
        get: http.createPathRequest(id => `/api/topics/${id}`),
        update: http.createPathDataRequest(id => `/api/topics/${id}`, "PATCH"),
        delete: http.createPathRequest(id => `/api/topics/${id}`, "DELETE")
    }
}

function mapFromTopicFilter(data: TopicFilter): any {
    return {
        ...data,
        order: mapFromOrderList(data.order)
    }
}

/**
 * 主题。
 */
export interface TopicEndpoint {
    /**
     * 查询主题列表。
     */
    list(filter: TopicFilter): Promise<Response<ListResult<Topic>>>
    /**
     * 新建主题。
     * @exception ALREADY_EXISTS ("Topic", "name", name) 主题重名
     * @exception NOT_EXISTS ("parentId", id) 指定的资源不存在
     * @exception RECURSIVE_PARENT 在父标签检查中发现了闭环
     * @exception ILLEGAL_CONSTRAINT ("type", "parent", parentType) 当前主题的类型和父主题的类型不能兼容
     */
    create(form: TopicCreateForm): Promise<Response<IdResponse, TopicExceptions["create"]>>
    /**
     * 查看主题。
     * @exception NOT_FOUND
     */
    get(id: number): Promise<Response<DetailTopic, NotFound>>
    /**
     * 更改主题。
     * @exception NOT_FOUND
     * @exception ALREADY_EXISTS ("Topic", "name", name) 主题重名
     * @exception NOT_EXISTS ("parentId", id) 指定的资源不存在
     * @exception RECURSIVE_PARENT 在父标签检查中发现了闭环
     * @exception ILLEGAL_CONSTRAINT ("type", "parent", parentType) 当前主题的类型和父主题的类型不能兼容
     */
    update(id: number, form: TopicUpdateForm): Promise<Response<null, TopicExceptions["update"]>>
    /**
     * 删除主题。
     * @exception NOT_FOUND
     */
    delete(id: number): Promise<Response<null, NotFound>>
}

export interface TopicExceptions {
    "create": AlreadyExists<"Topic", "name", string> | ResourceNotExist<"parentId", number> | RecursiveParentError | IllegalConstraintError<"type", "parent", TopicType[]> | ResourceNotExist<"site", string> | ResourceNotExist<"sourceTagType", string[]>
    "update": NotFound | AlreadyExists<"Topic", "name", string> | ResourceNotExist<"parentId", number> | RecursiveParentError | IllegalConstraintError<"type", "parent" | "children", TopicType[]> | ResourceNotExist<"site", string> | ResourceNotExist<"sourceTagType", string[]>
}

export type TopicType = "UNKNOWN" | "COPYRIGHT" | "IP" | "CHARACTER"

export interface Topic {
    /**
     * topic id。
     */
    id: number
    /**
     * 主题名称。需要遵守tag name规范。
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
     * 所属的分组根节点。
     */
    parentRoot: ParentTopic | null
    /**
     * 父节点id。
     */
    parentId: number | null,
    /**
     * 主题类型。
     */
    type: TopicType
    /**
     * 标记为收藏。
     */
    favorite: boolean
    /**
     * 评分。
     */
    score: number | null
    /**
     * 关联的项目数量。
     */
    count: number
    /**
     * 此topic的颜色。
     */
    color: UsefulColors | null
}

export interface DetailTopic extends Topic {
    /**
     * 主题的父标签。
     */
    parents: ParentTopic[]
    /**
     * 主题的子标签。
     */
    children: TopicChildrenNode[] | null
    /**
     * 描述。
     */
    description: string
    /**
     * 映射到此元数据的来源标签。
     */
    mappingSourceTags: MappingSourceTag[]
}

export interface SimpleTopic {
    id: number
    name: string
    type: TopicType
    color: UsefulColors | null
}

export interface TopicChildrenNode extends SimpleTopic {
    children: TopicChildrenNode[] | null
}

export interface ParentTopic extends SimpleTopic {

}

export interface RelatedSimpleTopic extends SimpleTopic {
    isExported: ExportType
    visibility: boolean
}

export interface TopicCreateForm {
    name: string
    otherNames?: string[] | null
    parentId?: number | null
    ordinal?: number
    type?: TopicType
    description?: string
    keywords?: string[]
    favorite?: boolean
    score?: number | null
    mappingSourceTags?: MappingSourceTagForm[] | null
}

export interface TopicUpdateForm {
    name?: string
    otherNames?: string[] | null
    parentId?: number | null
    ordinal?: number
    type?: TopicType
    description?: string
    keywords?: string[]
    favorite?: boolean
    score?: number | null
    mappingSourceTags?: MappingSourceTagForm[] | null
}

export type TopicFilter = TopicQueryFilter & LimitAndOffsetFilter

export interface TopicQueryFilter {
    query?: string
    order?: OrderList<"id" | "name" | "score" | "count" | "createTime" | "updateTime">
    type?: TopicType
    favorite?: boolean
    parentId?: number
}
