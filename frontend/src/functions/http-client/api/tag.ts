import { HttpInstance, Response } from "../instance"
import { IdResponse, LimitAndOffsetFilter, ListResult, OrderList } from "./all"
import { RelatedSimpleAnnotation } from "./annotations"
import { SimpleIllust } from "./illust"
import { MappingSourceTag, MappingSourceTagForm } from "./source-tag-mapping"
import {
    AlreadyExists,
    CannotGiveColorError, NotFound, RecursiveParentError,
    ResourceNotExist,
    ResourceNotSuitable
} from "../exceptions"

export function createTagEndpoint(http: HttpInstance): TagEndpoint {
    return {
        list: http.createQueryRequest("/api/tags"),
        tree: http.createQueryRequest("/api/tags/tree"),
        create: http.createDataRequest("/api/tags", "POST"),
        get: http.createPathRequest(id => `/api/tags/${id}`),
        update: http.createPathDataRequest(id => `/api/tags/${id}`, "PATCH"),
        delete: http.createPathRequest(id => `/api/tags/${id}`, "DELETE")
    }
}

/**
 * 标签。
 */
export interface TagEndpoint {
    /**
     * 查询标签列表。
     */
    list(filter: TagFilter): Promise<Response<ListResult<Tag>>>
    /**
     * 查询标签树。
     */
    tree(filter: TagTreeFilter): Promise<Response<TagTreeNode[]>>
    /**
     * 新建标签。
     * @exception NOT_EXIST ("parentId"|"links"|"examples"|"annotations", id) 指定的资源不存在
     * @exception NOT_SUITABLE ("examples"|"annotations", id) 指定的资源不适用。对于examples，只有类型为image的项目可用；对于annotations，是此注解的target要求不能应用于此种类的tag
     * @exception CANNOT_GIVE_COLOR 只有创建顶层标签时才能指定颜色
     * @exception ALREADY_EXISTS ("Tag", "name", name) 标签重名。addr类型的标签在同一个parent下禁止重名，tag类型的标签除上一条外还禁止与全局其他tag类型的标签重名
     */
    create(form: TagCreateForm): Promise<Response<IdResponse, TagExceptions["create"]>>
    /**
     * 查看标签。
     * @exception NOT_FOUND
     */
    get(id: number): Promise<Response<DetailTag, NotFound>>
    /**
     * 更改标签。
     * @exception NOT_FOUND
     * @exception NOT_EXIST ("parentId"|"links"|"examples"|"annotations", id) 指定的资源不存在
     * @exception NOT_SUITABLE ("examples"|"annotations|links", id) 指定的资源不适用。对于examples，只有类型为image的项目可用；对于annotations，是此注解的target要求不能应用于tag; 对于links，目标必须是非虚拟的
     * @exception RECURSIVE_PARENT 在父标签检查中发现了闭环
     * @exception CANNOT_GIVE_COLOR 只有顶层标签才能指定颜色
     * @exception ALREADY_EXISTS ("Tag", "name", name) 标签重名。addr类型的标签在同一个parent下禁止重名，tag类型的标签除上一条外还禁止与全局其他tag类型的标签重名
     */
    update(id: number, form: TagUpdateForm): Promise<Response<null, TagExceptions["update"]>>
    /**
     * 删除标签。
     * @exception NOT_FOUND
     *
     */
    delete(id: number): Promise<Response<null, TagExceptions["delete"]>>
}

export interface TagExceptions {
    "create": AlreadyExists<"Tag", "name", string> | CannotGiveColorError | ResourceNotExist<"parentId", number> | ResourceNotExist<"links" | "examples" | "annotations", number[]> | ResourceNotSuitable<"links" | "examples" | "annotations", number[]> | ResourceNotExist<"site", string>
    "update": NotFound | RecursiveParentError | AlreadyExists<"Tag", "name", string> | CannotGiveColorError | ResourceNotExist<"parentId", number> | ResourceNotExist<"links" | "examples" | "annotations", number[]> | ResourceNotSuitable<"links" | "examples" | "annotations", number[]> | ResourceNotExist<"site", string>
    "delete": NotFound
}

export type TagAddressType = "TAG" | "ADDR" | "VIRTUAL_ADDR"
export type TagGroupType = "NO" | "YES" | "FORCE" | "SEQUENCE" | "FORCE_AND_SEQUENCE"

export interface Tag {
    /**
     * tag id。
     */
    id: number
    /**
     * tag在当前parent下的排序顺位，从0开始。
     */
    ordinal: number
    /**
     * 父级tag的tag id。null表示没有父级tag，是顶层tag。
     */
    parentId: number | null
    /**
     * 标签名称。需要遵守tag name规范(不能为blank串，不能包含禁用字符' " ` . |)
     */
    name: string
    /**
     * 标签别名。需要遵守tag name规范(不能为blank串，不能包含禁用字符' " ` . |)，且长度不能超过32。
     */
    otherNames: string[]
    /**
     * 标签类型。
     */
    type: TagAddressType
    /**
     * 标签的组属性。
     */
    group: TagGroupType
    /**
     * 标签的颜色。颜色有与父标签同步的特性，因此只有根标签可以设置color，非根标签设置会抛出异常。
     */
    color: string | null
}

export interface DetailTag extends Tag {
    /**
     * 此标签的父标签列表。根节点在最前，直接父节点在最后。
     */
    parents: TagParent[]
    /**
     * 标签链接的其他标签的tag id。
     */
    links: TagLink[]
    /**
     * 标签的描述内容。
     */
    description: string
    /**
     * 标签的样例。
     */
    examples: SimpleIllust[]
    /**
     * 标签的注解。
     */
    annotations: RelatedSimpleAnnotation[]
    /**
     * 标签关联的项目的平均分。
     */
    score: number | null
    /**
     * 标签关联的项目的数量。
     */
    count: number
    /**
     * 映射到此元数据的来源标签。
     */
    mappingSourceTags: MappingSourceTag[]
}

export interface TagTreeNode {
    id: number
    name: string
    otherNames: string[]
    type: TagAddressType
    group: TagGroupType
    color: string | null
    children: TagTreeNode[] | null
}

export interface SimpleTag {
    id: number
    name: string
    color: string | null
}

export interface RelatedSimpleTag extends SimpleTag {
    isExported: boolean
}

export interface TagLink {
    id: number
    name: string
    type: TagAddressType
    group: TagGroupType
    color: string | null
}

export interface TagParent {
    id: number
    name: string
    type: TagAddressType
    group: TagGroupType
}

export interface TagCreateForm {
    name: string
    type: TagAddressType
    parentId: number | null
    otherNames?: string[] | null
    ordinal?: number | null
    group?: TagGroupType
    links?: number[]
    annotations?: (number | string)[] | null
    description?: string
    color?: string | null
    examples?: number[] | null
    mappingSourceTags?: MappingSourceTagForm[] | null
}

export interface TagUpdateForm {
    name?: string
    otherNames?: string[] | null
    ordinal?: number
    parentId?: number | null
    type?: TagAddressType
    group?: TagGroupType
    links?: number[] | null
    annotations?: (number | string)[] | null
    description?: string
    color?: string
    examples?: number[] | null
    mappingSourceTags?: MappingSourceTagForm[] | null
}

export interface TagFilter extends LimitAndOffsetFilter {
    search?: string | null
    order?: OrderList<"id" | "ordinal" | "name" | "createTime" | "updateTime">
    parent?: number
    type?: TagAddressType
    group?: boolean
}

export interface TagTreeFilter {
    parent?: number
}
