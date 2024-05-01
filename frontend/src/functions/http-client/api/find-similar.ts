import { HttpInstance, Response } from "../instance"
import { NotFound, ResourceNotExist } from "../exceptions"
import { FilePath, IdResponse, LimitAndOffsetFilter, ListResult, OrderList, SourceDataPath, SourceTagPath } from "./all"
import { CommonIllust, ImagePropsCloneForm } from "./illust"
import { SimpleBook } from "./book"
import { date, datetime, LocalDate, LocalDateTime } from "@/utils/datetime"

export function createFindSimilarEndpoint(http: HttpInstance): FindSimilarEndpoint {
    return {
        task: {
            list: http.createQueryRequest("/api/find-similar/tasks", "GET", {
                parseResponse: ({ total, result }: ListResult<any>) => ({total, result: result.map(mapToTask)})
            }),
            create: http.createDataRequest("/api/find-similar/tasks", "POST", {
                parseData: mapFromForm
            }),
            get: http.createPathRequest(id => `/api/find-similar/tasks/${id}`, "GET", {
                parseResponse: mapToTask
            }),
            delete: http.createPathRequest(id => `/api/find-similar/tasks/${id}`, "DELETE")
        },
        result: {
            list: http.createQueryRequest("/api/find-similar/results", "GET", {
                parseResponse: ({ total, result }: ListResult<any>) => ({total, result: result.map(mapToResult)})
            }),
            get: http.createPathRequest(id => `/api/find-similar/results/${id}`, "GET", {
                parseResponse: mapToDetailResult
            }),
            resolve: http.createPathDataRequest(id => `/api/find-similar/results/${id}/resolve`, "POST", {
                parseData: mapFromResolveForm
            }),
            delete: http.createPathRequest(id => `/api/find-similar/results/${id}`, "DELETE")
        },
        quickFind: {
            create: http.createDataRequest("/api/find-similar/quick-find/new", "POST"),
            get: http.createPathRequest(id => `/api/find-similar/quick-find/${id}`, "GET", {
                parseResponse: mapToQuickFindResult
            })
        }
    }
}

function mapFromTaskSelector(data: TaskSelector): any {
    if(data.type === "partitionTime") {
        return {
            type: "partitionTime",
            partitionTime: date.toISOString(data.partitionTime)
        }
    }else{
        return data
    }
}

function mapFromForm(data: FindSimilarTaskCreateForm): any {
    return {
        selector: mapFromTaskSelector(data.selector),
        config: data.config
    }
}

function mapFromResolveForm(data: FindSimilarResultResolveForm): any {
    return {
        clear: data.clear,
        actions: data.actions.map(action => action.type === "ADD_TO_COLLECTION" && action.specifyPartitionTime !== undefined ? {
            ...action,
            specifyPartitionTime: date.toISOString(action.specifyPartitionTime)
        } : action)
    }
}

function mapToTaskSelector(data: any): TaskSelector {
    if(data.type === "partitionTime") {
        return {
            type: "partitionTime",
            partitionTime: date.of(data.partitionTime)
        }
    }else{
        return data
    }
}

function mapToTask(data: any): FindSimilarTask {
    return {
        id: <number>data["id"],
        selector: mapToTaskSelector(data["selector"]),
        config: <TaskConfig | null>data["config"],
        recordTime: datetime.of(<string>data["recordTime"])
    }
}

function mapToResult(data: any): FindSimilarResult {
    return {
        id: <number>data["id"],
        category: <SimilarityCategory>data["category"],
        summaryType: <SimilaritySummaryType[]>data["summaryType"],
        images: <FindSimilarResultImage[]>data["images"],
        resolved: <boolean>data["resolved"],
        recordTime: datetime.of(<string>data["recordTime"])
    }
}

function mapToDetailResult(data: any): FindSimilarDetailResult {
    return {
        id: <number>data["id"],
        category: <SimilarityCategory>data["category"],
        summaryType: <SimilaritySummaryType[]>data["summaryType"],
        images: (<any[]>data["images"]).map(img => ({
            ...img,
            partitionTime: date.of(<string>img["partitionTime"]),
            orderTime: datetime.of(<string>img["orderTime"])
        })),
        edges: <SimilarityRelationEdge[]>data["edges"],
        coverages: <SimilarityRelationCoverage[]>data["coverages"],
        resolved: <boolean>data["resolved"],
        recordTime: datetime.of(<string>data["recordTime"])
    }
}

function mapToQuickFindResult(data: any): QuickFindResult {
    return {
        id: <number>data["id"],
        succeed: <boolean>data["succeed"],
        result: (<any[]>data["result"]).map(img => ({
            ...img,
            partitionTime: date.of(<string>img["partitionTime"]),
            orderTime: datetime.of(<string>img["orderTime"])
        }))
    }
}

/**
 * 相似项查找功能。
 */
export interface FindSimilarEndpoint {
    /**
     * 任务列表。
     */
    task: {
        /**
         * 查看列表。
         */
        list(filter: FindSimilarTaskFilter): Promise<Response<ListResult<FindSimilarTask>>>
        /**
         * 手动创建查找任务。
         */
        create(form: FindSimilarTaskCreateForm): Promise<Response<IdResponse>>
        /**
         * 查看指定的任务。
         */
        get(id: number): Promise<Response<FindSimilarTask, NotFound>>
        /**
         * 删除指定的任务。
         */
        delete(id: number): Promise<Response<null, NotFound>>
    }
    /**
     * 结果列表。
     */
    result: {
        /**
         * 查看结果列表。
         */
        list(filter: LimitAndOffsetFilter): Promise<Response<ListResult<FindSimilarResult>>>
        /**
         * 查看指定结果的详情。
         */
        get(id: number): Promise<Response<FindSimilarDetailResult, NotFound>>
        /**
         * 处理结果。
         */
        resolve(id: number, form: FindSimilarResultResolveForm): Promise<Response<null, NotFound | ResourceNotExist<"imageIds", number[]> | ResourceNotExist<"from" | "to", number>>>
        /**
         * 直接删除结果。
         * @param id
         */
        delete(id: number): Promise<Response<NotFound>>
    }
    /**
     * 速查。
     */
    quickFind: {
        /**
         * 用illust列表新建一个速查。
         */
        create(illusts: number[]): Promise<Response<IdResponse>>
        /**
         * 查询速查结果。
         */
        get(id: number): Promise<Response<QuickFindResult, NotFound>>
    }
}

export type TaskSelector = {
    type: "image"
    imageIds: number[]
} | {
    type: "partitionTime"
    partitionTime: LocalDate
} | {
    type: "book"
    bookIds: number[]
} | {
    type: "topic"
    topicIds: number[]
} | {
    type: "author"
    authorIds: number[]
} | {
    type: "sourceTag"
    sourceTags: SourceTagPath[]
}

export interface TaskConfig {
    findBySourceIdentity: boolean
    findBySourcePart: boolean
    findBySourceRelation: boolean
    findBySourceBook: boolean
    findBySimilarity: boolean
    filterInCurrentScope: boolean
    filterBySourcePart: boolean
    filterBySourceBook: boolean
    filterBySourceRelation: boolean
    filterByPartition: boolean
    filterByTopic: boolean
    filterByAuthor: boolean
    filterBySourceTagType: {sourceSite: string, tagType: string}[]
}

export type SimilarityCategory = "EQUIVALENCE" | "GRAPH"

export type SimilaritySummaryType = "EQUIVALENCE" | "RELATED" | "SIMILAR"

export interface FindSimilarTask {
    id: number
    selector: TaskSelector
    config: TaskConfig | null
    recordTime: LocalDateTime
}

export interface FindSimilarResult {
    id: number
    category: SimilarityCategory
    summaryType: SimilaritySummaryType[]
    images: FindSimilarResultImage[]
    resolved: boolean
    recordTime: LocalDateTime
}

export interface FindSimilarDetailResult extends FindSimilarResult {
    images: FindSimilarResultDetailImage[]
    edges: SimilarityRelationEdge[]
    coverages: SimilarityRelationCoverage[]
}

export interface QuickFindResult {
    id: number
    succeed: boolean
    result: FindSimilarResultDetailImage[]
}

export interface FindSimilarResultImage {
    id: number
    filePath: FilePath | null
}

export interface FindSimilarResultDetailImage extends CommonIllust {
    id: number
    filePath: FilePath
    favorite: boolean
    orderTime: LocalDateTime
    score: number | null
    source: SourceDataPath | null
    partitionTime: LocalDate
    parentId: number | null
    books: SimpleBook[]
}

export interface SimilarityRelationEdge {
    a: number
    b: number
    types: SimilarityRelationEdgeType[]
}

export interface SimilarityRelationCoverage {
    imageIds: number[]
    ignored: boolean
    info: SimilarityRelationCoverageType
}

export type SimilarityRelationEdgeType = {
    type: "SOURCE_IDENTITY_EQUAL"
    site: string
    sourceId: string | null
    sourcePart: number | null
    sourcePartName: string | null
} | {
    type: "HIGH_SIMILARITY"
    similarity: number
} | {
    type: "SOURCE_RELATED" | "ASSOCIATED" | "IGNORED"
}

export type SimilarityRelationCoverageType = {
    type: "SOURCE_IDENTITY_SIMILAR"
    site: string
    sourceId: string
} | {
    type: "SOURCE_BOOK"
    site: string
    sourceBookCode: string
} | {
    type: "COLLECTION"
    collectionId: number
} | {
    type: "BOOK"
    bookId: number
}

export interface FindSimilarTaskCreateForm {
    selector: TaskSelector
    config?: TaskConfig | null
}

export interface FindSimilarResultResolveForm {
    actions: FindSimilarResultResolveAction[]
    clear: boolean
}

export type FindSimilarResultResolveAction = ({type: "CLONE_IMAGE"} & ImagePropsCloneForm) | {
    type: "ADD_TO_COLLECTION"
    imageIds: number[]
    collectionId: number | string
    specifyPartitionTime?: LocalDate
} | {
    type: "ADD_TO_BOOK"
    imageIds: number[]
    bookId: number
} | {
    type: "DELETE"
    imageIds: number[]
} | {
    type: "MARK_IGNORED"
    from: number
    to: number
} | {
    type: "MARK_IGNORED_SOURCE_BOOK"
    site: string
    sourceBookCode: string
} | {
    type: "MARK_IGNORED_SOURCE_DATA"
    site: string
    sourceId: string
}

export interface FindSimilarTaskQueryFilter {
    order?: OrderList<"id" | "recordTime">
}

export type FindSimilarTaskFilter = FindSimilarTaskQueryFilter & LimitAndOffsetFilter
