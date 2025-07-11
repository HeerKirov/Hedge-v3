import { HttpInstance, Response } from ".."
import { AlreadyExists, NotFound, RecursiveParentError, Reject, ResourceNotExist, ResourceNotSuitable } from "../exceptions"
import { FilePath, IdResponse, LimitAndOffsetFilter, ListResult, OrderList, SourceDataPath } from "./all"
import { Tagme } from "./illust"
import { datetime, LocalDateTime } from "@/utils/datetime"

export function createFolderEndpoint(http: HttpInstance): FolderEndpoint {
    return {
        list: http.createQueryRequest("/api/folders", "GET", {
            parseResponse: ({ total, result }: ListResult<any>) => ({total, result: result.map(mapToFolder)})
        }),
        tree: http.createQueryRequest("/api/folders/tree", "GET", {
            parseResponse: (result: any[]) => result.map(mapToFolderTreeNode)
        }),
        create: http.createDataRequest("/api/folders", "POST"),
        get: http.createPathRequest(id => `/api/folders/${id}`, "GET", {
            parseResponse: mapToFolder
        }),
        update: http.createPathDataRequest(id => `/api/folders/${id}`, "PATCH"),
        delete: http.createPathRequest(id => `/api/folders/${id}`, "DELETE"),
        batchUpdate: http.createDataRequest("/api/folders/batch-update", "POST"),
        batchDelete: http.createDataRequest("/api/folders/batch-delete", "POST"),
        images: {
            get: http.createPathQueryRequest(id => `/api/folders/${id}/images`, "GET", {
                parseResponse: ({ total, result }: ListResult<any>) => ({total, result: result.map(mapToFolderImage)})
            }),
            update: http.createPathDataRequest(id => `/api/folders/${id}/images`, "PUT"),
            partialUpdate: http.createPathDataRequest(id => `/api/folders/${id}/images`, "PATCH")
        },
        pin: {
            list: http.createRequest("/api/folders/pin"),
            set: http.createPathDataRequest(id => `/api/folders/pin/${id}`, "PUT", {
                parseData: ordinal => ({ordinal})
            }),
            unset: http.createPathRequest(id => `/api/folders/pin/${id}`, "DELETE"),
        }
    }
}

function mapToBaseFolder(data: any): BaseFolder {
    return {
        id: <number>data["id"],
        title: <string>data["title"],
        type: <FolderType>data["type"],
        imageCount: <number | null>data["imageCount"],
        createTime: datetime.of(<string>data["createTime"]),
        updateTime: datetime.of(<string>data["updateTime"]),
        pinned: <boolean>data["pinned"]
    }
}

function mapToFolder(data: any): Folder {
    return {
        ...mapToBaseFolder(data),
        parentId: <number | null>data["parentId"],
        parentAddress: <string[]>data["parentAddress"]
    }
}

function mapToFolderTreeNode(data: any): FolderTreeNode {
    return {
        ...mapToBaseFolder(data),
        children: (<any[] | null>data["children"])?.map(mapToFolderTreeNode) ?? null
    }
}

function mapToFolderImage(data: any): FolderImage {
    return {
        id: <number>data["id"],
        filePath: <FilePath>data["filePath"],
        score: <number | null>data["score"],
        favorite: <boolean>data["favorite"],
        tagme: <Tagme[]>data["tagme"],
        source: <SourceDataPath | null>data["source"],
        orderTime: datetime.of(<string>data["orderTime"])
    }
}

export interface FolderEndpoint {
    /**
     * 查询目录列表。
     */
    list(filter: FolderFilter): Promise<Response<ListResult<Folder>>>
    /**
     * 查询树状目录列表。
     */
    tree(filter: FolderTreeFilter): Promise<Response<FolderTreeNode[]>>
    /**
     * 创建新的目录。
     */
    create(form: FolderCreateForm): Promise<Response<IdResponse, FolderExceptions["create"]>>
    /**
     * 查看目录。
     */
    get(folderId: number): Promise<Response<Folder, NotFound>>
    /**
     * 修改目录的元数据。
     */
    update(folderId: number, form: FolderUpdateForm): Promise<Response<null, FolderExceptions["update"]>>
    /**
     * 删除目录。
     */
    delete(folderId: number): Promise<Response<null, NotFound>>
    /**
     * 批量修改目录。
     */
    batchUpdate(form: FolderBatchUpdateForm): Promise<Response<null, FolderExceptions["update"]>>
    /**
     * 批量删除目录。
     */
    batchDelete(target: number[]): Promise<Response<null, FolderExceptions["batchDelete"]>>
    images: {
        /**
         * 查询下属images。
         */
        get(folderId: number, filter: FolderImageFilter): Promise<Response<ListResult<FolderImage>>>
        /**
         * 全量修改images列表。
         */
        update(folderId: number, items: number[]): Promise<Response<null, FolderExceptions["images.update"]>>
        /**
         * 部分修改images列表。
         */
        partialUpdate(folderId: number, form: FolderImagesPartialUpdateForm): Promise<Response<null, FolderExceptions["images.partialUpdate"]>>
    }
    pin: {
        /**
         * 查看pin folder列表。
         */
        list(): Promise<Response<SimpleFolder[]>>
        /**
         * 设置pin。
         * @throws Reject 不能设置NODE。
         */
        set(folderId: number, ordinal?: number): Promise<Response<null, NotFound | Reject>>
        /**
         * 取消设置pin。
         * @throws Reject 不能设置NODE。
         */
        unset(folderId: number): Promise<Response<null, NotFound | Reject>>
    }
}

export interface FolderExceptions {
    "create": AlreadyExists<"Folder", "name", string> | ResourceNotExist<"images", number[]> | ResourceNotExist<"parentId", number> | ResourceNotSuitable<"parentId", number>
    "update": NotFound | AlreadyExists<"Folder", "name", string> | ResourceNotExist<"parentId", number> | ResourceNotSuitable<"parentId", number> | RecursiveParentError
    "batchDelete": ResourceNotExist<"target", number>
    "images.update": NotFound | Reject | ResourceNotExist<"images", number[]>
    "images.partialUpdate": NotFound | Reject | ResourceNotExist<"images", number[]>
}

export type FolderType = "NODE" | "FOLDER"

interface BaseFolder {
    /**
     * folder id。
     */
    id: number
    /**
     * 名称标题。
     */
    title: string
    /**
     * 类型。
     */
    type: FolderType
    /**
     * FOLDER类型的项目数量。
     */
    imageCount: number | null
    /**
     * 是否已固定到侧边栏。
     */
    pinned: boolean
    /**
     * 创建时间。
     */
    createTime: LocalDateTime
    /**
     * 更改时间。
     */
    updateTime: LocalDateTime
}

export interface Folder extends BaseFolder {
    /**
     * 所有父节点的名称列表。顶层节点在前。不包括自己的名称。
     */
    parentAddress: string[]
    /**
     * 父节点。
     */
    parentId: number | null
}

export interface FolderTreeNode extends BaseFolder {
    /**
     * 所有子节点。
     */
    children: FolderTreeNode[] | null
}

export interface SimpleFolder {
    id: number
    address: string[]
    type: FolderType
}

export interface FolderImage {
    id: number
    filePath: FilePath
    score: number | null
    favorite: boolean
    tagme: Tagme[]
    source: SourceDataPath | null
    orderTime: LocalDateTime
}

export interface FolderCreateForm {
    title: string
    type: FolderType
    parentId?: number | null
    ordinal?: number | null
    images?: number[] | null
}

export interface FolderUpdateForm {
    title?: string
    parentId?: number | null
    ordinal?: number
}

export interface FolderBatchUpdateForm {
    target: number[]
    parentId?: number | null
    ordinal?: number
}

export type FolderImagesPartialUpdateForm = {
    /**
     * ADD: 添加新项目。这种模式执行添加时总是按照images列表的顺序添加，且允许选择已有项目(这将移动这些项目)。
     * MOVE: 移动现有项目的位置。这种模式选取的image必须是已经存在的，且执行移动时，总是保持选取的image之间的相对排序不变。
     */
    action: "ADD" | "MOVE"
    /**
     * 新添加的image id。
     */
    images: number[]
    /**
     * 插入位置。不填默认放在末尾。
     */
    ordinal?: number | null
} | {
    /**
     * DELETE: 移除现有项目。
     * REVERSE: 翻转现有项目的排列顺序。
     * SORT_BY_ORDER_TIME: 按orderTime的排序顺序重新设置排列顺序。
     * SORT_BY_SOURCE_ID: 按sourceId的排序顺序重新设置排列顺序。
     */
    action: "DELETE" | "REVERSE" | "SORT_BY_ORDER_TIME" | "SORT_BY_SOURCE_ID"
    /**
     * 要操作的项目的image id。
     */
    images: number[]
}

export type FolderFilter = FolderQueryFilter & LimitAndOffsetFilter

export interface FolderQueryFilter {
    search?: string
    order?: OrderList<"id" | "ordinal" | "title" | "createTime" | "updateTime">
}

export interface FolderTreeFilter {
    parent?: number | null
}

export type FolderImageFilter = FolderImageQueryFilter & LimitAndOffsetFilter

export interface FolderImageQueryFilter {
    favorite?: boolean
    order?: OrderList<"id" | "score" | "ordinal" | "orderTime" | "createTime" | "updateTime">
}
