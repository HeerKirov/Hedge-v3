import { HttpInstance, Response } from ".."
import { AlreadyExists, NotFound, RecursiveParentError, Reject, ResourceNotExist, ResourceNotSuitable } from "../exceptions"
import { IdResponse, LimitAndOffsetFilter, ListResult, OrderList } from "./all"
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
        file: <string>data["file"],
        thumbnailFile: <string>data["thumbnailFile"],
        score: <number | null>data["score"],
        favorite: <boolean>data["favorite"],
        tagme: <Tagme[]>data["tagme"],
        sourceSite: <string | null>data["sourceSite"],
        sourceId: <number | null>data["sourceId"],
        sourcePart: <number | null>data["sourcePart"],
        orderTime: datetime.of(<string>data["orderTime"])
    }
}

export interface FolderEndpoint {
    /**
     * ?????????????????????
     */
    list(filter: FolderFilter): Promise<Response<ListResult<Folder>>>
    /**
     * ???????????????????????????
     */
    tree(filter: FolderTreeFilter): Promise<Response<FolderTreeNode[]>>
    /**
     * ?????????????????????
     */
    create(form: FolderCreateForm): Promise<Response<IdResponse, FolderExceptions["create"]>>
    /**
     * ???????????????
     * @param FolderId
     */
    get(FolderId: number): Promise<Response<Folder, NotFound>>
    /**
     * ???????????????????????????
     */
    update(FolderId: number, form: FolderUpdateForm): Promise<Response<null, FolderExceptions["update"]>>
    /**
     * ???????????????
     */
    delete(FolderId: number): Promise<Response<null, NotFound>>
    images: {
        /**
         * ????????????images???
         */
        get(FolderId: number, filter: FolderImageFilter): Promise<Response<ListResult<FolderImage>>>
        /**
         * ????????????images?????????
         */
        update(FolderId: number, items: number[]): Promise<Response<null, FolderExceptions["images.update"]>>
        /**
         * ????????????images?????????
         */
        partialUpdate(FolderId: number, form: FolderImagesPartialUpdateForm): Promise<Response<null, FolderExceptions["images.partialUpdate"]>>
    }
    pin: {
        /**
         * ??????pin folder?????????
         */
        list(): Promise<Response<SimpleFolder[]>>
        /**
         * ??????pin???
         * @throws Reject ????????????NODE???
         */
        set(folderId: number, ordinal?: number): Promise<Response<null, NotFound | Reject>>
        /**
         * ????????????pin???
         * @throws Reject ????????????NODE???
         */
        unset(folderId: number): Promise<Response<null, NotFound | Reject>>
    }
}

export interface FolderExceptions {
    "create": AlreadyExists<"Folder", "name", string> | ResourceNotExist<"images", number[]> | ResourceNotExist<"parentId", number> | ResourceNotSuitable<"parentId", number>
    "update": NotFound | AlreadyExists<"Folder", "name", string> | ResourceNotExist<"parentId", number> | ResourceNotSuitable<"parentId", number> | RecursiveParentError
    "images.update": NotFound | Reject | ResourceNotExist<"images", number[]>
    "images.partialUpdate": NotFound | Reject | ResourceNotExist<"images", number[]>
}

export type FolderType = "NODE" | "FOLDER"

interface BaseFolder {
    /**
     * folder id???
     */
    id: number
    /**
     * ???????????????
     */
    title: string
    /**
     * ?????????
     */
    type: FolderType
    /**
     * FOLDER????????????????????????
     */
    imageCount: number | null
    /**
     * ??????????????????????????????
     */
    pinned: boolean
    /**
     * ???????????????
     */
    createTime: LocalDateTime
    /**
     * ???????????????
     */
    updateTime: LocalDateTime
}

export interface Folder extends BaseFolder {
    /**
     * ?????????????????????????????????????????????????????????????????????????????????
     */
    parentAddress: string[]
    /**
     * ????????????
     */
    parentId: number | null
}

export interface FolderTreeNode extends BaseFolder {
    /**
     * ??????????????????
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
    file: string
    thumbnailFile: string
    score: number | null
    favorite: boolean
    tagme: Tagme[]
    sourceSite: string | null
    sourceId: number | null
    sourcePart: number | null
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

export type FolderImagesPartialUpdateForm = {
    /**
     * ?????????????????????????????????????????????????????????images???????????????????????????????????????????????????(????????????????????????)???
     */
    action: "ADD"
    /**
     * ????????????image id???
     */
    images: number[]
    /**
     * ??????????????????????????????????????????
     */
    ordinal?: number | null
} | {
    /**
     * ???????????????????????????????????????????????????image?????????????????????????????????????????????????????????????????????image??????????????????????????????
     */
    action: "MOVE"
    /**
     * ??????????????????image id???
     */
    images: number[]
    /**
     * ????????????????????????????????????????????????
     */
    ordinal?: number | null
} | {
    /**
     * ?????????????????????
     */
    action: "DELETE"
    /**
     * ?????????????????????image id???
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
