import { HttpInstance, Response } from ".."
import { ConflictingGroupMembersError, NotFound, ResourceNotExist, ResourceNotSuitable } from "../exceptions"
import { FilePath, IdResponse, LimitAndOffsetFilter, ListResult, OrderList, SourceDataPath } from "./all"
import { RelatedSimpleTopic } from "./topic"
import { RelatedSimpleAuthor } from "./author"
import { RelatedSimpleTag } from "./tag"
import { CommonIllust, Tagme } from "./illust"
import { date, datetime, LocalDate, LocalDateTime } from "@/utils/datetime"

export function createBookEndpoint(http: HttpInstance): BookEndpoint {
    return {
        list: http.createQueryRequest("/api/books", "GET", {
            parseResponse: ({ total, result }: ListResult<any>) => ({total, result: result.map(mapToBook)})
        }),
        create: http.createDataRequest("/api/books", "POST"),
        get: http.createPathRequest(id => `/api/books/${id}`, "GET", {
            parseResponse: mapToDetailBook
        }),
        update: http.createPathDataRequest(id => `/api/books/${id}`, "PATCH"),
        delete: http.createPathRequest(id => `/api/books/${id}`, "DELETE"),
        images: {
            get: http.createPathQueryRequest(id => `/api/books/${id}/images`, "GET", {
                parseResponse: ({ total, result }: ListResult<any>) => ({total, result: result.map(mapToBookImage)})
            }),
            update: http.createPathDataRequest(id => `/api/books/${id}/images`, "PUT"),
            partialUpdate: http.createPathDataRequest(id => `/api/books/${id}/images`, "PATCH")
        }
    }
}

function mapToBook(data: any): Book {
    return {
        id: <number>data["id"],
        title: <string>data["title"],
        imageCount: <number>data["imageCount"],
        filePath: <FilePath | null>data["filePath"],
        score: <number | null>data["score"],
        favorite: <boolean>data["favorite"],
        createTime: datetime.of(<string>data["createTime"]),
        updateTime: datetime.of(<string>data["updateTime"])
    }
}

function mapToDetailBook(data: any): DetailBook {
    return {
        ...mapToBook(data),
        topics: <RelatedSimpleTopic[]>data["topics"],
        authors: <RelatedSimpleAuthor[]>data["authors"],
        tags: <RelatedSimpleTag[]>data["tags"],
        description: <string>data["description"]
    }
}

function mapToBookImage(data: any): BookImage {
    return {
        id: <number>data["id"],
        filePath: <FilePath>data["filePath"],
        score: <number | null>data["score"],
        favorite: <boolean>data["favorite"],
        tagme: <Tagme[]>data["tagme"],
        source: <SourceDataPath | null>data["source"],
        orderTime: datetime.of(<string>data["orderTime"]),
        partitionTime: date.of(<string>data["partitionTime"])
    }
}

export interface BookEndpoint {
    /**
     * 查询画集列表。
     */
    list(filter: BookFilter): Promise<Response<ListResult<Book>>>
    /**
     * 创建新的画集。
     * @throws NOT_EXIST ("images", number[]) 图库项目不存在。
     */
    create(form: BookCreateForm): Promise<Response<IdResponse, BookExceptions["create"]>>
    /**
     * 查看画集。
     * @param bookId
     */
    get(bookId: number): Promise<Response<DetailBook, NotFound>>
    /**
     * 修改画集的元数据。
     * @throws ResourceNotExist ("topics" | "authors" |"tags", number[])
     * @throws ResourceNotSuitable ("tags", number[])
     * @throws ConflictingGroupMembersError
     */
    update(bookId: number, form: BookUpdateForm): Promise<Response<null, BookExceptions["update"]>>
    /**
     * 删除画集。
     */
    delete(bookId: number): Promise<Response<null, NotFound>>
    images: {
        /**
         * 查询下属images。
         */
        get(bookId: number, filter: LimitAndOffsetFilter): Promise<Response<ListResult<BookImage>>>
        /**
         * 全量修改images列表。
         */
        update(bookId: number, items: number[]): Promise<Response<null, BookExceptions["images.update"]>>
        /**
         * 部分修改images列表。
         * @param bookId
         * @param form
         */
        partialUpdate(bookId: number, form: BookImagesPartialUpdateForm): Promise<Response<null, BookExceptions["images.partialUpdate"]>>
    }
}

export interface BookExceptions {
    "create": ResourceNotExist<"images", number[]>,
    "update": NotFound | ResourceNotExist<"topics" | "authors" | "tags", number[]> | ResourceNotSuitable<"tags", number[]> | ConflictingGroupMembersError
    "images.update": NotFound | ResourceNotExist<"images", number[]>
    "images.partialUpdate": NotFound | ResourceNotExist<"images", number[]>
}

export interface Book {
    /**
     * book id.
     */
    id: number
    /**
     * book标题。
     */
    title: string
    /**
     * book下含有的image数量。
     */
    imageCount: number
    /**
     * 作为book封面的image文件。如果book没有项目，那么文件是null。
     */
    filePath: FilePath | null
    /**
     * 评分。
     */
    score: number | null
    /**
     * 是否收藏。
     */
    favorite: boolean
    /**
     * 此画集的创建时间。
     */
    createTime: LocalDateTime
    /**
     * 此画集上次更改内含项目的时间。
     */
    updateTime: LocalDateTime
}

export interface DetailBook extends Book {
    /**
     * topic元数据。
     */
    topics: RelatedSimpleTopic[]
    /**
     * author元数据。
     */
    authors: RelatedSimpleAuthor[]
    /**
     * tag元数据。
     */
    tags: RelatedSimpleTag[]
    /**
     * 描述。
     */
    description: string
}

export interface SimpleBook {
    id: number
    title: string
    filePath: FilePath | null
}

export interface BookImage extends CommonIllust {
    id: number
    filePath: FilePath
    favorite: boolean
    score: number | null
    source: SourceDataPath | null
    tagme: Tagme[]
    orderTime: LocalDateTime
    partitionTime: LocalDate
}

export interface BookCreateForm {
    title?: string | null
    description?: string | null
    images: number[]
    score?: number | null
    favorite?: boolean
}

export interface BookUpdateForm {
    title?: string | null
    description?: string | null
    score?: number | null
    favorite?: boolean
    topics?: number[]
    authors?: number[]
    tags?: number[]
}

export type BookImagesPartialUpdateForm = {
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

export type BookFilter = BookQueryFilter & LimitAndOffsetFilter

export interface BookQueryFilter {
    query?: string
    order?: OrderList<"id" | "score" | "createTime" | "updateTime">
    favorite?: boolean
    topic?: number
    author?: number
}
