import { HttpInstance, Response } from "../instance"
import { NotFound, ResourceNotExist } from "../exceptions"
import { IdResponse, LimitAndOffsetFilter, ListResult, OrderList } from "./all"
import { SimpleIllust } from "./illust"
import { date, datetime, LocalDate, LocalDateTime } from "@/utils/datetime"

export function createFindSimilarEndpoint(http: HttpInstance): FindSimilarEndpoint {
    return {
        task: {
            list: http.createQueryRequest("/api/find-similar/tasks", "GET", {
                parseResponse: ({ total, result }: ListResult<any>) => ({total, result: result.map(mapToTask)})
            }),
            create: http.createDataRequest("/api/find-similar/tasks", "POST", {
                parseResponse: mapFromForm
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
                parseResponse: mapToResult
            }),
            process: http.createDataRequest("/api/find-similar/results", "POST")
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
        type: <ResultType>data["type"],
        images: <SimpleIllust[]>data["images"],
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
        list(filter: FindSimilarResultFilter): Promise<Response<ListResult<FindSimilarResult>>>
        /**
         * 查看指定结果的详情。
         */
        get(id: number): Promise<Response<FindSimilarResult, NotFound>>
        /**
         * 处理结果。
         */
        process(form: FindSimilarResultProcessForm): Promise<Response<null, ResourceNotExist<string, number[]>>>
    }
}

export type TaskSelector = {
    type: "image"
    imageIds: number[]
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
    source: string
    sourceTags: string[]
}

export interface TaskConfig {
    findBySourceKey: boolean
    findBySimilarity: boolean
    findBySourceRelation: boolean
    findBySourceMark: boolean
    findBySimilarityThreshold: number | null
    findBySourceRelationBasis: RelationBasis[] | null
    filterByPartition: boolean
    filterByTopic: boolean
    filterByAuthor: boolean
    filterBySourceTagType: {source: string, tagType: string}[]
}

export type RelationBasis = "RELATION" | "POOL" | "PART"

export type ResultType = "DUPLICATED" | "OTHERS"

export type ProcessAction = "DELETE" | "RETAIN_OLD" | "RETAIN_OLD_AND_CLONE_PROPS" | "RETAIN_NEW" | "RETAIN_NEW_AND_CLONE_PROPS"

export interface FindSimilarTask {
    id: number
    selector: TaskSelector
    config: TaskConfig | null
    recordTime: LocalDateTime
}

export interface FindSimilarResult {
    id: number
    type: ResultType
    images: SimpleIllust[]
    recordTime: LocalDateTime
}

export interface FindSimilarTaskCreateForm {
    selector: TaskSelector
    config?: TaskConfig | null
}

export interface FindSimilarResultProcessForm {
    target?: number[]
    action: ProcessAction
}

export type FindSimilarTaskFilter = FindSimilarTaskQueryFilter & LimitAndOffsetFilter

export type FindSimilarResultFilter = FindSimilarResultQueryFilter & LimitAndOffsetFilter

export interface FindSimilarTaskQueryFilter {
    order?: OrderList<"id" | "recordTime">
}

export interface FindSimilarResultQueryFilter {
    order?: OrderList<"id" | "orderedId" | "recordTime">
}
