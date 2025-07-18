import { date, datetime, LocalDate, LocalDateTime } from "@/utils/datetime"
import { HttpInstance, Response } from "../instance"
import {
    ConflictingGroupMembersError,
    NotFound, ParamError,
    ParamNotRequired, ParamRequired,
    ResourceNotExist, ResourceNotSuitable
} from "../exceptions"
import {
    FilePath,
    IdResponse,
    LimitAndOffsetFilter,
    ListResult,
    OrderList,
    PatchUnit,
    SourceDataPath,
    SourceTagPath
} from "./all"
import { SimpleBook } from "./book"
import { RelatedSimpleTopic } from "./topic"
import { RelatedSimpleAuthor } from "./author"
import { RelatedSimpleTag } from "./tag"
import { SimpleFolder } from "./folder"
import { SourceEditStatus, SourceTag, SourceTagForm, SourceBook, SourceBookForm, SourceAdditionalInfoForm, SourceAdditionalInfo } from "./source-data"

export function createIllustEndpoint(http: HttpInstance): IllustEndpoint {
    return {
        list: http.createQueryRequest("/api/illusts", "GET", {
            parseResponse: ({ total, result }: ListResult<any>) => ({total, result: result.map(mapToIllust)}),
            parseQuery: mapFromIllustFilter
        }),
        listPartitions: http.createQueryRequest("/api/illusts/partitions", "GET", {
            parseQuery: mapFromPartitionFilter,
            parseResponse: d => (<any[]>d).map(mapToPartition)
        }),
        findByIds: http.createDataRequest("/api/illusts/find-by-ids", "POST", {
            parseResponse: (result: (any | null)[]) => result.map(i => i !== null ? mapToIllust(i) : null)
        }),
        summaryByIds: http.createDataRequest("/api/illusts/summary-by-ids", "POST", {
            parseResponse: mapToIllustSummary
        }),
        findLocation: http.createQueryRequest("/api/illusts/find-location", "GET", {
            parseQuery: mapFromIllustFilter
        }),
        get: http.createPathRequest(id => `/api/illusts/${id}`, "GET", {
            parseResponse: mapToDetailIllust
        }),
        getSimple: http.createPathRequest(id => `/api/illusts/${id}/simple`, "GET", {
            parseResponse: mapToIllust
        }),
        update: http.createPathDataRequest(id => `/api/illusts/${id}`, "PATCH", {
            parseData: mapFromImageUpdateForm
        }),
        delete: http.createPathQueryRequest(id => `/api/illusts/${id}`, "DELETE"),
        collection: {
            create: http.createDataRequest("/api/illusts/collection", "POST", {
                parseData: mapFromCollectionCreateForm
            }),
            get: http.createPathRequest(id => `/api/illusts/collection/${id}`, "GET", {
                parseResponse: mapToDetailIllust
            }),
            update: http.createPathDataRequest(id => `/api/illusts/collection/${id}`, "PATCH", {
                parseData: mapFromImageUpdateForm
            }),
            delete: http.createPathQueryRequest(id => `/api/illusts/collection/${id}`, "DELETE"),
            relatedItems: {
                get: http.createPathRequest(id => `/api/illusts/collection/${id}/related-items`, "GET", {
                    parseResponse: mapToCollectionRelatedItems
                }),
                update: http.createPathDataRequest(id => `/api/illusts/collection/${id}/related-items`, "PATCH")
            },
            images: {
                get: http.createPathQueryRequest(id => `/api/illusts/collection/${id}/images`, "GET", {
                    parseResponse: ({ total, result }: ListResult<any>) => ({total, result: result.map(mapToIllust)}),
                }),
                update: http.createPathDataRequest(id => `/api/illusts/collection/${id}/images`, "PUT", {
                    parseData: mapFromCollectionImagesUpdateForm
                }),
                partialUpdate: http.createPathDataRequest(id => `/api/illusts/collection/${id}/images`, "PATCH", {
                    parseData: mapFromCollectionImagesPartialUpdateForm
                }),
            }
        },
        image: {
            get: http.createPathRequest(id => `/api/illusts/image/${id}`, "GET", {
                parseResponse: mapToDetailIllust
            }),
            update: http.createPathDataRequest(id => `/api/illusts/image/${id}`, "PATCH", {
                parseData: mapFromImageUpdateForm
            }),
            delete: http.createPathQueryRequest(id => `/api/illusts/image/${id}`, "DELETE"),
            relatedItems: {
                get: http.createPathRequest(id => `/api/illusts/image/${id}/related-items`, "GET", {
                    parseResponse: mapToImageRelatedItems
                }),
                update: http.createPathDataRequest(id => `/api/illusts/image/${id}/related-items`, "PATCH")
            },
            sourceData: {
                get: http.createPathRequest(id => `/api/illusts/image/${id}/source-data`, "GET", {
                    parseResponse: mapToImageSourceData
                }),
                update: http.createPathDataRequest(id => `/api/illusts/image/${id}/source-data`, "PATCH", {
                    parseData: mapFromImageSourceDataUpdateForm
                })
            }
        },
        associate: {
            get: http.createPathRequest(id => `/api/illusts/associate/${id}`, "GET", {
                parseResponse: (result: any[]) => result.map(mapToIllust)
            }),
            set: http.createPathDataRequest(id => `/api/illusts/associate/${id}`, "PUT", {
                parseResponse: (result: any[]) => result.map(mapToIllust)
            }),
        },
        batchUpdate: http.createDataRequest("/api/illusts/batch-update", "POST", {
            parseData: mapFromIllustBatchUpdateForm
        }),
        cloneImageProps: http.createDataRequest("/api/illusts/clone-image-props", "POST")
    }
}

function mapToIllust(data: any): Illust {
    return {
        id: <number>data["id"],
        type: <IllustType>data["type"],
        childrenCount: <number | null>data["childrenCount"],
        filePath: <FilePath>data["filePath"],
        score: <number | null>data["score"],
        favorite: <boolean>data["favorite"],
        tagme: <Tagme[]>data["tagme"],
        source: <SourceDataPath | null>data["source"],
        partitionTime: date.of(<string>data["partitionTime"]),
        orderTime: datetime.of(<string>data["orderTime"])
    }
}

function mapToDetailIllust(data: any): DetailIllust {
    return {
        ...mapToIllust(data),
        extension: <string>data["extension"],
        size: <number>data["size"],
        resolutionWidth: <number>data["resolutionWidth"],
        resolutionHeight: <number>data["resolutionHeight"],
        videoDuration: <number>data["videoDuration"],
        topics: <RelatedSimpleTopic[]>data["topics"],
        authors: <RelatedSimpleAuthor[]>data["authors"],
        tags: <RelatedSimpleTag[]>data["tags"],
        description: <string>data["description"],
        originDescription: <string>data["originDescription"],
        originScore: <number | null>data["originScore"],
        parent: <SimpleCollection | null>data["parent"],
        children: <SimpleIllust[] | null>data["children"],
        books: <SimpleBook[]>data["books"],
        folders: <SimpleFolder[]>data["folders"],
        associateCount: <number>data["associateCount"],
        createTime: datetime.of(<string>data["createTime"]),
        updateTime: datetime.of(<string>data["updateTime"])
    }
}

function mapToPartition(data: any): Partition {
    return {
        date: date.of(<string>data["date"]),
        count: <number>data["count"]
    }
}

function mapToCollectionRelatedItems(data: any): CollectionRelatedItems {
    return {
        children: <SimpleIllust[]>data["children"],
        childrenCount: <number>data["childrenCount"],
        books: <SimpleBook[]>data["books"],
        folders: <SimpleFolder[]>data["folders"],
        associates: (<any[]>data["associates"]).map(mapToIllust)
    }
}

function mapToImageRelatedItems(data: any): ImageRelatedItems {
    return {
        collection: <SimpleCollection | null>data["collection"],
        books: <SimpleBook[]>data["books"],
        folders: <SimpleFolder[]>data["folders"],
        associates: (<any[]>data["associates"]).map(mapToIllust)
    }
}

function mapToImageSourceData(data: any): ImageSourceData {
    return {
        ...data,
        publishTime: data.publishTime ? datetime.of(<string>data["publishTime"]) : null,
    }
}

function mapToIllustSummary(data: any): IllustSummary {
    return {
        ...data,
        orderTimeMin: datetime.of(data.orderTimeMin),
        orderTimeMax: datetime.of(data.orderTimeMax),
    }
}

function mapFromCollectionCreateForm(form: CollectionCreateForm): any {
    return {
        ...form,
        specifyPartitionTime: form.specifyPartitionTime !== undefined ? date.toISOString(form.specifyPartitionTime) : undefined
    }
}

function mapFromCollectionImagesUpdateForm(form: CollectionImagesUpdateForm): any {
    return {
        illustIds: form.illustIds,
        specifyPartitionTime: form.specifyPartitionTime !== undefined ? date.toISOString(form.specifyPartitionTime) : undefined
    }
}

function mapFromCollectionImagesPartialUpdateForm(form: CollectionImagesPartialUpdateForm): any {
    return {
        ...mapFromCollectionImagesUpdateForm(form),
        ordinal: form.ordinal,
        action: form.action
    }
}

function mapFromImageUpdateForm(form: IllustUpdateForm): any {
    return {
        ...form,
        partitionTime: form.partitionTime !== undefined ? date.toISOString(form.partitionTime) : undefined,
        orderTime: form.orderTime !== undefined ? datetime.toISOString(form.orderTime) : undefined
    }
}

function mapFromImageSourceDataUpdateForm(form: ImageSourceDataUpdateForm): any {
    return {
        ...form,
        publishTime: form.publishTime !== undefined ? date.toISOString(form.publishTime) : undefined,
    }
}

function mapFromIllustBatchUpdateForm(form: IllustBatchUpdateForm): any {
    return {
        ...form,
        partitionTime: form.partitionTime !== undefined ? date.toISOString(form.partitionTime) : undefined,
        orderTimeBegin: form.orderTimeBegin !== undefined ? datetime.toISOString(form.orderTimeBegin) : undefined,
        orderTimeEnd: form.orderTimeEnd !== undefined ? datetime.toISOString(form.orderTimeEnd) : undefined,
        orderTimeList: form.orderTimeList !== undefined ? form.orderTimeList.map(d => datetime.toISOString(d)) : undefined
    }
}

function mapFromIllustFilter(data: IllustFilter | IllustLocationFilter) {
    return {
        ...data,
        partition: data.partition && date.toISOString(data.partition)
    }
}

function mapFromPartitionFilter(filter: PartitionFilter) {
    return {
        gte: filter.gte && date.toISOString(filter.gte),
        lt: filter.lt && date.toISOString(filter.lt),
        query: filter.query,
        type: filter.type
    }
}

/**
 * 图库项目。
 */
export interface IllustEndpoint {
    /**
     * 查询图库项目列表。
     */
    list(filter: IllustFilter): Promise<Response<ListResult<Illust>>>
    /**
     * 查询分区列表。
     */
    listPartitions(filter: PartitionFilter): Promise<Response<Partition[]>>
    /**
     * 根据id列表查询所有的项。
     */
    findByIds(imageIds: number[]): Promise<Response<(Illust | null)[]>>
    /**
     * 根据id列表，查询所有项的概括属性。
     */
    summaryByIds(filter: IllustSummaryForm): Promise<Response<IllustSummary>>
    /**
     * 查询指定图像在指定查询条件下的列表中的位置下标。
     */
    findLocation(filter: IllustLocationFilter): Promise<Response<IllustLocation>>
    /**
     * 查看元数据。不区分类型。
     * @exception NOT_FOUND
     */
    get(id: number): Promise<Response<DetailIllust, NotFound>>
    /**
     * 进行简单查阅。
     * @exception NOT_FOUND
     */
    getSimple(id: number): Promise<Response<Illust, NotFound>>
    /**
     * 更改元数据。仅涉及公有部分。
     * @exception NOT_FOUND
     * @exception PARAM_ERROR ("score") score超出范围
     * @exception NOT_EXIST ("tags"|"topics"|"authors", number[]) 选择的关联资源并不存在
     * @exception NOT_SUITABLE ("tags", number[]) 选择的资源不适用。tag: 不能选择addr类型的tag
     * @exception CONFLICTING_GROUP_MEMBERS ({[id: number]: {memberId: number, member: string}[]}) 违反tag冲突组约束。参数值是每一项冲突组的tagId，以及这个组下有冲突的tag的id和name列表
     */
    update(id: number, form: IllustUpdateForm): Promise<Response<null, IllustExceptions["collection.update"]>>
    /**
     * 删除项目。
     * @exception NOT_FOUND
     */
    delete(id: number, options?: IllustDeleteOptions): Promise<Response<null, NotFound>>
    /**
     * collection类型的项的操作API。collection是image的集合，不能为空，空集合会自动删除。每个image只能从属一个集合。
     */
    collection: {
        /**
         * 创建一个新的collection。
         * @exception PARAM_ERROR ("score") score超出范围
         * @exception PARAM_REQUIRED ("images") images未提供
         * @exception RESOURCE_NOT_EXIST ("images", id: number[]) image id不存在或者可能是collection，总之不能用
         */
        create(form: CollectionCreateForm): Promise<Response<IdResponse, ResourceNotExist<"images", number[]>>>
        /**
         * 查看collection的元数据。
         * @exception NOT_FOUND
         */
        get(id: number): Promise<Response<DetailIllust, NotFound>>
        /**
         * 更改collection的元数据。
         * @exception NOT_FOUND
         * @exception PARAM_ERROR ("score") score超出范围
         * @exception NOT_EXIST ("tags"|"topics"|"authors", number[]) 选择的关联资源并不存在
         * @exception NOT_SUITABLE ("tags", number[]) 选择的资源不适用。tag: 不能选择addr类型的tag
         * @exception CONFLICTING_GROUP_MEMBERS ({[id: number]: {memberId: number, member: string}[]}) 违反tag冲突组约束。参数值是每一项冲突组的tagId，以及这个组下有冲突的tag的id和name列表
         */
        update(id: number, form: IllustUpdateForm): Promise<Response<null, IllustExceptions["collection.update"]>>
        /**
         * 删除collection。
         * @exception NOT_FOUND
         */
        delete(id: number, options?: IllustDeleteOptions): Promise<Response<null, NotFound>>
        /**
         * collection的关联内容。只有关联组。
         */
        relatedItems: {
            /**
             * 查看关联内容。
             * @exception NOT_FOUND
             */
            get(id: number): Promise<Response<CollectionRelatedItems, NotFound>>
            /**
             * 更改关联内容。
             * @exception NOT_FOUND
             * @exception RESOURCE_NOT_EXIST ("associateId", id: number) 目标关联组不存在
             */
            update(id: number, form: CollectionRelatedUpdateForm): Promise<Response<null, IllustExceptions["collection.relatedItems.update"]>>
        }
        /**
         * collection的下属image。
         */
        images: {
            /**
             * 查询下属images。
             */
            get(id: number, filter: LimitAndOffsetFilter): Promise<Response<ListResult<Illust>, NotFound>>
            /**
             * 更改下属images。
             * @exception PARAM_REQUIRED ("images") images未提供
             * @exception RESOURCE_NOT_EXIST ("images", id: number[]) image id不存在或者可能是collection，总之不能用
             */
            update(id: number, form: CollectionImagesUpdateForm): Promise<Response<null, IllustExceptions["collection.images.update"]>>
            /**
             * 部分更改下属images。
             * @exception PARAM_REQUIRED ("images") images未提供
             * @exception RESOURCE_NOT_EXIST ("images", id: number[]) image id不存在或者可能是collection，总之不能用
             */
            partialUpdate(id: number, form: CollectionImagesPartialUpdateForm): Promise<Response<null, IllustExceptions["collection.images.update"]>>
        }
    }
    /**
     * image类型的项的操作API。
     */
    image: {
        /**
         * 查看image的元数据。
         * @exception NOT_FOUND
         */
        get(id: number): Promise<Response<DetailIllust, NotFound>>
        /**
         * 更改image的元数据。
         * @exception NOT_FOUND
         * @exception PARAM_ERROR ("score") score超出范围
         * @exception NOT_EXIST ("tags"|"topics"|"authors", number[]) 选择的关联资源并不存在
         * @exception NOT_SUITABLE ("tags", number[]) 选择的资源不适用。tag: 不能选择addr类型的tag
         * @exception CONFLICTING_GROUP_MEMBERS ({[id: number]: {memberId: number, member: string}[]}) 违反tag冲突组约束。参数值是每一项冲突组的tagId，以及这个组下有冲突的tag的id和name列表
         */
        update(id: number, form: IllustUpdateForm): Promise<Response<null, IllustExceptions["image.update"]>>
        /**
         * 删除image。
         * @exception NOT_FOUND
         */
        delete(id: number, options?: IllustDeleteOptions): Promise<Response<null, NotFound>>
        /**
         * image的关联内容。包括关联组、所属画集、所属集合。
         */
        relatedItems: {
            /**
             * 查看关联内容。
             * @exception NOT_FOUND
             */
            get(id: number): Promise<Response<ImageRelatedItems, NotFound>>
            /**
             * 更改关联内容。
             * @exception NOT_FOUND
             * @exception RESOURCE_NOT_EXIST ("associateId"|"collectionId", id: number) 目标关联组/集合不存在
             */
            update(id: number, form: ImageRelatedUpdateForm): Promise<Response<null, IllustExceptions["image.relatedItems.update"]>>
        }
        /**
         * image的来源数据。包括关联的来源数据的id，以及关联到的来源数据内容。
         */
        sourceData: {
            /**
             * 查看来源数据。
             * @exception NOT_FOUND
             */
            get(id: number): Promise<Response<ImageSourceData, NotFound>>
            /**
             * 更改来源数据。
             * @exception NOT_FOUND
             * @exception NOT_EXIST ("site", source) 此source不存在
             * @exception PARAM_ERROR ("sourceId"/"sourcePart") 参数值错误，需要为自然数
             * @exception PARAM_REQUIRED ("sourceId"/"sourcePart") 需要这些参数
             * @exception PARAM_NOT_REQUIRED ("sourcePart"/"sourceId/sourcePart") 不需要这些参数
             */
            update(id: number, form: ImageSourceDataUpdateForm): Promise<Response<null, IllustExceptions["image.sourceData.update"]>>
        }
    }
    associate: {
        /**
         * 查看illust的关联组。
         * @exception NOT_FOUND
         */
        get(id: number): Promise<Response<Illust[], NotFound>>
        /**
         * 修改illust的关联组。
         * @exception NOT_FOUND
         */
        set(id: number, illusts: number[]): Promise<Response<Illust[], NotFound>>
    }
    /**
     * 批量更新元数据。
     */
    batchUpdate(form: IllustBatchUpdateForm): Promise<Response<null, IllustExceptions["batch.update"]>>
    /**
     * 将一个图像的属性和关系克隆到另一个图像。
     */
    cloneImageProps(form: ImagePropsCloneForm): Promise<Response<null>>
}

export interface IllustExceptions {
    "collection.update": NotFound | ResourceNotExist<"topics" | "authors" | "tags", number[]> | ResourceNotSuitable<"tags", number[]> | ConflictingGroupMembersError
    "collection.relatedItems.update": NotFound | ResourceNotExist<"associateId", number>
    "collection.images.update": NotFound | ResourceNotExist<"images", number[]>
    "image.update": NotFound | ResourceNotExist<"topics" | "authors" | "tags", number[]> | ResourceNotSuitable<"tags", number[]> | ConflictingGroupMembersError
    "image.relatedItems.update": NotFound | ResourceNotExist<"collectionId" | "associateId", number>
    "image.sourceData.update": NotFound | ResourceNotExist<"site", string> | ResourceNotExist<"additionalInfo", string> | ResourceNotExist<"sourceTagType", string[]> | ParamNotRequired | ParamRequired | ParamError
    "batch.update": NotFound | ResourceNotExist<"topics" | "authors" | "tags" | "target" | "timeInsertBegin" | "timeInsertEnd", number[]> | ResourceNotSuitable<"tags" | "target", number[]> | ConflictingGroupMembersError
}

export type IllustType = "COLLECTION" | "IMAGE"

export type IllustQueryType = IllustType | "ONLY_IMAGE" | "ONLY_COLLECTION"

export type Tagme = "TAG" | "AUTHOR" | "TOPIC" | "SOURCE"

export type BatchUpdateAction = "SET_PARTITION_TIME_TODAY" | "SET_PARTITION_TIME_EARLIEST" | "SET_PARTITION_TIME_LATEST" | "SET_PARTITION_TIME_MOST"
    | "SET_ORDER_TIME_NOW" | "SET_ORDER_TIME_REVERSE" | "SET_ORDER_TIME_UNIFORMLY" | "SET_ORDER_TIME_MOST"
    | "SET_ORDER_TIME_BY_SOURCE_ID" | "SET_ORDER_TIME_BY_BOOK_ORDINAL" | "SET_ORDER_TIME_BY_FOLDER_ORDINAL"

/**
 * 所有Illust的公共结构，包括Illust, BookIllust, FolderIllust, StagingPostIllust等，只要是在Dataset展示的数据，都是它的子类型。
 */
export interface CommonIllust {
    id: number
    filePath: FilePath
    favorite: boolean
    orderTime: LocalDateTime
    type?: IllustType
    childrenCount?: number | null
    score: number | null
    source: SourceDataPath | null
}

/**
 * 用在drag&drop系统的类型，符合公共结构，只是把type变成了必选参数。
 */
export interface DraggingIllust extends CommonIllust {
    type: IllustType
}

export interface Partition {
    date: LocalDate
    count: number
}

export interface IllustLocation {
    /**
     * 最终获得的那个项的id。
     */
    id: number
    /**
     * 最终搜索到的偏移量。-1表示无结果，-2表示HQL查询错误因此中止搜索。
     */
    index: number | -1 | -2
    /**
     * 最终获得的那个项的类型，是保持原IMAGE还是转而搜索了它的父COLLECTION。
     */
    type: IllustType
}

export interface Illust extends CommonIllust {
    /**
     * illust id。
     */
    id: number
    /**
     * illust类型。
     */
    type: IllustType
    /**
     * 子项目的数量。只有类型为COLLECTION的项目会有子项目。
     */
    childrenCount: number | null
    /**
     * 此项目的文件路径。
     */
    filePath: FilePath
    /**
     * 此项目的评分。可能由手写评分或父子项目导出。
     */
    score: number | null
    /**
     * 是否收藏。
     */
    favorite: boolean
    /**
     * tagme标记。
     */
    tagme: Tagme[]
    /**
     * source。
     */
    source: SourceDataPath | null
    /**
     * 分区时间。
     */
    partitionTime: LocalDate
    /**
     * 此项目的排序时间。
     */
    orderTime: LocalDateTime
}

export interface DetailIllust extends Illust {
    /**
     * 扩展名。
     */
    extension: string
    /**
     * 文件大小。
     */
    size: number
    /**
     * 分辨率宽度。
     */
    resolutionWidth: number
    /**
     * 分辨率高度。
     */
    resolutionHeight: number
    /**
     * 视频文件时长，单位毫秒。如果不存在或没有，则是0。
     */
    videoDuration: number
    /**
     * 主题。
     */
    topics: RelatedSimpleTopic[]
    /**
     * 作者。
     */
    authors: RelatedSimpleAuthor[]
    /**
     * 标签。
     */
    tags: RelatedSimpleTag[]
    /**
     * 描述。可能由手写描述或父集合导出。
     */
    description: string
    /**
     * 手写的原始描述。
     */
    originDescription: string
    /**
     * 手写的原始评分。
     */
    originScore: number | null
    /**
     * image所属的collection。
     */
    parent: SimpleCollection | null
    /**
     * collection下属的images。这里最多只会列出9个项。
     */
    children: SimpleIllust[] | null
    /**
     * image所属的画集列表。
     */
    books: SimpleBook[]
    /**
     * image所属的文件夹列表。
     */
    folders: SimpleFolder[]
    /**
     * 关联项的数量。
     */
    associateCount: number
    /**
     * 创建时间。
     */
    createTime: LocalDateTime
    /**
     * 关联的图像上次发生更新的时间。
     */
    updateTime: LocalDateTime
}

export interface SimpleIllust {
    id: number
    filePath: FilePath
}

export interface SimpleCollection extends SimpleIllust {
    childrenCount: number
}

interface CommonRelatedItems {
    /**
     * 关联组。
     */
    associates: Illust[]
    /**
     * image所属的画集列表。
     */
    books: SimpleBook[]
    /**
     * image所属的文件夹列表。
     */
    folders: SimpleFolder[]
}

export interface CollectionRelatedItems extends CommonRelatedItems {
    /**
     * collection下属的images。这里最多只会列出9个项。
     */
    children: SimpleIllust[]
    /**
     * collection下属的images的数量。
     */
    childrenCount: number
}

export interface ImageRelatedItems extends CommonRelatedItems {
    /**
     * image所属的collection。
     */
    collection: SimpleCollection | null
}

export type ImageSourceData = {
    /**
     * source。
     */
    source: SourceDataPath
    /**
     * source站点的显示标题。当此站点没有标题时值为null。
     */
    sourceSiteName: string | null
    /**
     * 是否是无内容的。
     */
    empty: boolean
    /**
     * 编辑状态记录。
     */
    status: SourceEditStatus
    /**
     * 来源数据：标题。
     */
    title: string
    /**
     * 来源数据：描述。
     */
    description: string
    /**
     * 来源数据：标签。
     */
    tags: SourceTag[]
    /**
     * 来源数据：所属pool的标题列表。
     */
    books: SourceBook[]
    /**
     * 来源数据：关联项的id列表。
     */
    relations: string[]
    /**
     * 相关链接。
     */
    links: string[]
    /**
     * 附加元数据。
     */
    additionalInfo: SourceAdditionalInfo[]
    /**
     * 发布时间。
     */
    publishTime: LocalDateTime | null
} | {
    source: null
    sourceTitle: null
    empty: true
    status: "NOT_EDITED"
    title: null
    description: null
    tags: null
    books: null
    relations: null
    links: null
    additionalInfo: null
    publishTime: null
}

export interface IllustSummary {
    illustIds: number[]
    topics: RelatedSimpleTopic[]
    tags: RelatedSimpleTag[]
    authors: RelatedSimpleAuthor[]
    tagme: Tagme[]
    description: string
    favorite: boolean
    scoreMin: number | null
    scoreMax: number | null
    scoreAvg: number | null
    orderTimeMin: LocalDateTime
    orderTimeMax: LocalDateTime
}

export interface CollectionCreateForm {
    images: number[]
    description?: string
    score?: number
    favorite?: boolean
    tagme?: Tagme[]
    specifyPartitionTime?: LocalDate
}

export interface CollectionRelatedUpdateForm {
    associates?: number[]
}

export interface CollectionImagesUpdateForm {
    illustIds: number[]
    specifyPartitionTime?: LocalDate
}

export interface CollectionImagesPartialUpdateForm {
    illustIds: number[]
    action: "ADD" | "DELETE"
    specifyPartitionTime?: LocalDate
    ordinal?: number
}

export interface ImageRelatedUpdateForm extends CollectionRelatedUpdateForm {
    collectionId?: number | null
}

export interface ImageSourceDataUpdateForm {
    source?: SourceDataPath | null
    title?: string | null
    description?: string | null
    tags?: SourceTagForm[]
    books?: SourceBookForm[]
    relations?: string[]
    additionalInfo?: SourceAdditionalInfoForm[]
    status?: SourceEditStatus
    publishTime?: LocalDateTime
}

export interface IllustUpdateForm {
    topics?: number[]
    authors?: number[]
    tags?: number[]
    description?: string | null
    score?: number | null
    favorite?: boolean
    tagme?: Tagme[]
    partitionTime?: LocalDate
    orderTime?: LocalDateTime
}

export interface IllustBatchUpdateForm {
    target: number[]
    description?: string | null
    score?: number | null
    favorite?: boolean
    tags?: number[]
    topics?: number[]
    authors?: number[]
    mappingSourceTags?: SourceTagPath[]
    tagUpdateMode?: "APPEND" | "OVERRIDE" | "REMOVE"
    tagme?: Tagme[]
    tagmePatch?: PatchUnit<Tagme[]>[]
    partitionTime?: LocalDate
    orderTimeBegin?: LocalDateTime
    orderTimeEnd?: LocalDateTime
    orderTimeExclude?: boolean
    orderTimeList?: LocalDateTime[]
    timeInsertBegin?: number
    timeInsertEnd?: number
    timeInsertAt?: "before" | "after"
    action?: BatchUpdateAction
    actionBy?: number
}

export interface ImagePropsCloneForm {
    from: number
    to: number
    props: {
        score?: boolean
        favorite?: boolean
        description?: boolean
        tagme?: boolean
        metaTags?: boolean
        partitionTime?: boolean
        orderTime?: boolean
        collection?: boolean
        books?: boolean
        folders?: boolean
        associate?: boolean
        source?: boolean
    }
    merge?: boolean
    deleteFrom?: boolean
}

export type IllustFilter = IllustQueryFilter & LimitAndOffsetFilter

export interface IllustQueryFilter {
    /**
     * 使用HQL进行查询。list API不提示解析结果，需要使用另外的API。
     */
    query?: string
    /**
     * 排序字段列表。优先使用来自HQL的排序。
     */
    order?: OrderList<"id" | "score" | "orderTime" | "createTime" | "updateTime">
    /**
     * 查询类型。IMAGE仅查询image类型；COLLECTION查询collection项以及非collection所属的项。
     */
    type: IllustQueryType
    /**
     * 分区。
     */
    partition?: LocalDate
    /**
     * 收藏标记。
     */
    favorite?: boolean
    /**
     * 按topic id筛选。
     */
    topic?: number
    /**
     * 按author id筛选。
     */
    author?: number
}

export interface PartitionFilter {
    gte?: LocalDate
    lt?: LocalDate
    query?: string
    type?: IllustQueryType
}

export interface IllustLocationFilter extends IllustQueryFilter {
    /**
     * 要查询的image。
     */
    imageId: number
}

export interface IllustSummaryForm {
    illustIds: number[]
    unfold?: boolean
}

export interface IllustDeleteOptions {
    deleteCompletely?: boolean
    deleteCollectionChildren?: boolean
}
