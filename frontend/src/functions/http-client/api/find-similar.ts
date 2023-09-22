import { HttpInstance, Response } from "../instance"
import { NotFound, ResourceNotExist } from "../exceptions"
import { IdResponse, LimitAndOffsetFilter, ListResult, NullableFilePath, OrderList, SourceTagPath } from "./all"
import { ImagePropsCloneForm } from "./illust"
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
            resolve: http.createPathDataRequest(id => `/api/find-similar/results/${id}/resolve`, "POST"),
            delete: http.createPathRequest(id => `/api/find-similar/results/${id}`, "DELETE")
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
        type: <SummaryTypes[]>data["type"],
        images: <FindSimilarResultImage[]>data["images"],
        recordTime: datetime.of(<string>data["recordTime"])
    }
}

function mapToDetailResult(data: any): FindSimilarDetailResult {
    return {
        id: <number>data["id"],
        type: <SummaryTypes[]>data["type"],
        images: <FindSimilarResultImage[]>data["images"],
        relations: <FindSimilarResultRelation[]>data["relations"],
        recordTime: datetime.of(<string>data["recordTime"])
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
        resolve(id: number, form: FindSimilarResultResolveForm): Promise<Response<null, NotFound | ResourceNotExist<"config.a" | "config.b", FindSimilarEntityKey>>>
        /**
         * 直接删除结果。
         * @param id
         */
        delete(id: number): Promise<Response<NotFound>>
    }
}

export type TaskSelector = {
    type: "image"
    imageIds: number[]
} | {
    type: "importImage"
    importIds: number[]
} | {
    type: "partitionTime"
    partitionTime: LocalDate
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
    findBySourceRelation: boolean
    findBySourceMark: boolean
    findBySimilarity: boolean
    filterByOtherImport: boolean
    filterByPartition: boolean
    filterByTopic: boolean
    filterByAuthor: boolean
    filterBySourceTagType: {sourceSite: string, tagType: string}[]
}

export type FindSimilarEntityType = "ILLUST" | "IMPORT_IMAGE"

export type SummaryTypes = "SAME" | "RELATED" | "SIMILAR"

export type SimilarityType = "SOURCE_IDENTITY_EQUAL" | "SOURCE_IDENTITY_SIMILAR" | "SOURCE_RELATED" | "RELATION_MARK_SAME" | "RELATION_MARK_SIMILAR" | "RELATION_MARK_RELATED" | "TOO_HIGH_SIMILARITY" | "HIGH_SIMILARITY" | "EXISTED"

export type MarkType = SummaryTypes | "UNKNOWN"

export type ActionType = "CLONE_IMAGE" | "DELETE" | "ADD_TO_COLLECTION" | "ADD_TO_BOOK" | "MARK_IGNORED"

interface FindSimilarEntityKey {
    type: FindSimilarEntityType
    id: number
}

interface RelationInfo {}

interface SourceIdentityRelationInfo extends RelationInfo { site: string, sourceId: number, sourcePart: number | null }

interface SourceRelatedRelationInfo extends RelationInfo { hasRelations: boolean, sameBooks: number[] }

interface SourceMarkRelationInfo extends RelationInfo { markType: MarkType }

interface SimilarityRelationInfo extends RelationInfo { similarity: number }

interface ExistedRelationInfo extends RelationInfo { sameCollectionId: number | null, samePreCollection: string | null, sameBooks: number[], sameAssociate: boolean, ignored: boolean }

export interface FindSimilarTask {
    id: number
    selector: TaskSelector
    config: TaskConfig | null
    recordTime: LocalDateTime
}

export interface FindSimilarResult {
    id: number
    type: SummaryTypes[]
    images: FindSimilarResultImage[]
    recordTime: LocalDateTime
}

export interface FindSimilarDetailResult extends FindSimilarResult {
    relations: FindSimilarResultRelation[]
}

export interface FindSimilarResultImage extends FindSimilarEntityKey {
    filePath: NullableFilePath | null
}

interface FindSimilarResultRelationTemplate<T extends SimilarityType, I extends RelationInfo> { a: FindSimilarEntityKey, b: FindSimilarEntityKey, type: T, info: I }

export type FindSimilarResultRelation
    = FindSimilarResultRelationTemplate<"SOURCE_IDENTITY_EQUAL", SourceIdentityRelationInfo>
    | FindSimilarResultRelationTemplate<"SOURCE_IDENTITY_SIMILAR", SourceIdentityRelationInfo>
    | FindSimilarResultRelationTemplate<"SOURCE_RELATED", SourceRelatedRelationInfo>
    | FindSimilarResultRelationTemplate<"RELATION_MARK_SAME", SourceMarkRelationInfo>
    | FindSimilarResultRelationTemplate<"RELATION_MARK_SIMILAR", SourceMarkRelationInfo>
    | FindSimilarResultRelationTemplate<"RELATION_MARK_RELATED", SourceMarkRelationInfo>
    | FindSimilarResultRelationTemplate<"HIGH_SIMILARITY", SimilarityRelationInfo>
    | FindSimilarResultRelationTemplate<"TOO_HIGH_SIMILARITY", SimilarityRelationInfo>
    | FindSimilarResultRelationTemplate<"EXISTED", ExistedRelationInfo>

export interface FindSimilarTaskCreateForm {
    selector: TaskSelector
    config?: TaskConfig | null
}

export interface FindSimilarResultResolveForm {
    actions: FindSimilarResultResolveAction[]
}

interface FindSimilarResultResolveActionTemplate<A extends ActionType> { a: FindSimilarEntityKey, actionType: A }

export type FindSimilarResultResolveAction
    = (FindSimilarResultResolveActionTemplate<"CLONE_IMAGE"> & { b: FindSimilarEntityKey, config: { props: ImagePropsCloneForm["props"], merge?: boolean, deleteFrom?: boolean } })
    | (FindSimilarResultResolveActionTemplate<"ADD_TO_COLLECTION"> & { config: { collectionId: string | number } })
    | (FindSimilarResultResolveActionTemplate<"ADD_TO_BOOK"> & { config: { bookId: number } })
    | FindSimilarResultResolveActionTemplate<"DELETE">
    | (FindSimilarResultResolveActionTemplate<"MARK_IGNORED"> & { b: FindSimilarEntityKey })

export interface FindSimilarTaskQueryFilter {
    order?: OrderList<"id" | "recordTime">
}

export type FindSimilarTaskFilter = FindSimilarTaskQueryFilter & LimitAndOffsetFilter
