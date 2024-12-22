import { UsefulColors } from "@/constants/ui"
import { LocalDate, date } from "@/utils/datetime"
import { HttpInstance, Response } from ".."
import { SimpleIllust } from "./illust"
import { TopicType } from "./topic"
import { AuthorType } from "./author"
import { FilePath } from "./all"

export function createHomepageEndpoint(http: HttpInstance): HomepageEndpoint {
    return {
        homepage: http.createQueryRequest("/api/homepage", "GET", {
            parseResponse: mapToHomepageRes
        }),
        state: http.createRequest("/api/homepage/state", "GET", {
            parseResponse: mapToHomepageState
        }),
        backgroundTasks: http.createRequest("/api/homepage/background-tasks", "GET"),
        cleanCompletedBackgroundTasks: http.createRequest("/api/homepage/background-tasks/clean", "POST"),
        resetHomepage: http.createRequest("/api/homepage/reset", "POST"),
    }
}

function mapToHomepageRes(data: any): HomepageRes {
    return {
        ...data,
        date: date.of(<string>data["date"]),
        page: <number>data["page"],
        illusts: (<any[]>data["illusts"]).map(data => ({
            id: <number>data["id"],
            filePath: <FilePath>data["filePath"],
            partitionTime: date.of(<string>data["partitionTime"])
        }))
    }
}

function mapToHomepageState(data: any): HomepageState {
    return {
        ...data,
        today: date.of(<string>data["today"])
    }
}

export interface HomepageEndpoint {
    /**
     * 获得主页信息。
     */
    homepage(filter: {page: number}): Promise<Response<HomepageRes>>
    /**
     * 查看主要状态类信息。
     */
    state(): Promise<Response<HomepageState>>
    /**
     * 查看后台任务信息。
     */
    backgroundTasks(): Promise<Response<BackgroundTask[]>>
    /**
     * 清理已完成的后台任务项，将其从列表中移除。
     */
    cleanCompletedBackgroundTasks(): Promise<Response<undefined>>
    /**
     * 重设主页内容。
     */
    resetHomepage(): Promise<Response<undefined>>
}

export type BackgroundTaskType
    = "FILE_ARCHIVE"
    | "FILE_GENERATE"
    | "FIND_SIMILARITY"
    | "EXPORT_ILLUST_METADATA"
    | "EXPORT_BOOK_METADATA"
    | "EXPORT_ILLUST_BOOK_RELATION"
    | "EXPORT_ILLUST_FOLDER_RELATION"

interface HomepageState {
    today: LocalDate
    importImageCount: number
    importImageErrorCount: number
    findSimilarCount: number
    stagingPostCount: number
}

export type HomepageRes = {
    date: LocalDate
    page: number
    illusts: SampledIllust[]
} & ({extraType: "TOPIC", extras: ExtraTopic[]} | {extraType: "AUTHOR", extras: ExtraAuthor[]} | {extraType: "BOOK", extras: ExtraBook[]})

export interface BackgroundTask {
    type: BackgroundTaskType
    currentValue: number
    maxValue: number
}

interface ExtraTopic {
    id: number
    name: string
    type: TopicType
    color: UsefulColors | null
    images: SimpleIllust[]
}

interface ExtraAuthor {
    id: number
    name: string
    type: AuthorType
    color: UsefulColors | null
    images: SimpleIllust[]
}

interface ExtraBook {
    id: number
    title: string
    filePath: FilePath | null
    favorite: boolean
    imageCount: number
}

interface SampledIllust extends SimpleIllust {
    partitionTime: LocalDate
}
