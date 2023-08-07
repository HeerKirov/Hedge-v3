import { HttpInstance, Response } from ".."
import { ResourceNotExist } from "../exceptions"
import { FilePath, LimitAndOffsetFilter, ListResult, SourceDataPath } from "./all"
import { datetime, LocalDateTime } from "@/utils/datetime"

export function createStagingPostEndpoint(http: HttpInstance): StagingPostEndpoint {
    return {
        list: http.createQueryRequest("/api/staging-post", "GET", {
            parseResponse: ({ total, result }: ListResult<any>) => ({total, result: result.map(mapToStagingPostImage)})
        }),
        update: http.createDataRequest("/api/staging-post", "PATCH")
    }
}

function mapToStagingPostImage(data: any): StagingPostImage {
    return {
        id: <number>data["id"],
        filePath: <FilePath>data["filePath"],
        score: <number | null>data["score"],
        favorite: <boolean>data["favorite"],
        source: <SourceDataPath | null>data["source"],
        orderTime: datetime.of(<string>data["orderTime"])
    }
}

export interface StagingPostEndpoint {
    /**
     * 查询图像列表。
     */
    list(filter: LimitAndOffsetFilter): Promise<Response<ListResult<StagingPostImage>>>
    /**
     * 提交对中转站内容的更改。
     */
    update(form: StagingPostUpdateForm): Promise<Response<null, ResourceNotExist<"images", number[]>>>
}

export interface StagingPostImage {
    id: number
    filePath: FilePath
    score: number | null
    favorite: boolean
    source: SourceDataPath | null
    orderTime: LocalDateTime
}

export type StagingPostUpdateForm = {
    /**
     * 添加新项目。这种模式执行添加时总是按照images列表的顺序添加，且允许选择已有项目(这将移动这些项目)。
     */
    action: "ADD"
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
     * 移动现有项目的位置。这种模式选取的image必须是已经存在的，且执行移动时，总是保持选取的image之间的相对排序不变。
     */
    action: "MOVE"
    /**
     * 选取的项目的image id。
     */
    images: number[]
    /**
     * 放置的新位置。不填默认放在末尾。
     */
    ordinal?: number | null
} | {
    /**
     * 移除现有项目。
     */
    action: "DELETE"
    /**
     * 要移除的项目的image id。
     */
    images: number[]
} | {
    /**
     * 移除所有项目。
     */
    action: "CLEAR"
}
