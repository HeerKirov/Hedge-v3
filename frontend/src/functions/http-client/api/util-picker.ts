import { HttpInstance, Response } from ".."
import { SimpleFolder } from "./folder"
import { MetaType, SimpleAuthor, SimpleTopic } from "./all"
import { datetime, LocalDateTime } from "@/utils/datetime"

export function createUtilSearchEndpoint(http: HttpInstance): UtilSearchEndpoint {
    return {
        history: {
            folders: http.createRequest("/api/utils/picker/history/folders"),
            topics: http.createRequest("/api/utils/picker/history/topics"),
            authors: http.createRequest("/api/utils/picker/history/authors"),
            metaKeywords: http.createQueryRequest("/api/utils/picker/history/meta-keywords", "GET", {
                parseResponse: (data: any[]) => data.map(mapToKeywordInfo)
            }),
            push: http.createDataRequest("/api/utils/picker/history", "POST")
        }
    }
}

function mapToKeywordInfo(data: any): KeywordInfo {
    return {
        ...data,
        lastUsedTime: datetime.of(<string>data["lastUsedTime"])
    }
}

/**
 * 工具API：资源提取、查询和引用相关。
 */
export interface UtilSearchEndpoint {
    /**
     * 引用记录。
     */
    history: {
        /**
         * folder的最近使用记录。
         */
        folders(): Promise<Response<SimpleFolder[]>>,
        /**
         * topic的最近使用记录。
         */
        topics(): Promise<Response<SimpleTopic[]>>,
        /**
         * author的最近使用记录。
         */
        authors(): Promise<Response<SimpleAuthor[]>>,
        /**
         * 查询keywords。
         */
        metaKeywords(filter: MetaKeywordFilter): Promise<Response<KeywordInfo[]>>
        /**
         * 添加最近使用记录。
         */
        push(form: HistoryPushForm): Promise<Response<null>>
    }
}

export interface KeywordInfo {
    tagType: MetaType
    keyword: string
    tagCount: number
    lastUsedTime: LocalDateTime
}

interface HistoryPushForm {
    type: "FOLDER" | "TOPIC" | "AUTHOR"
    id: number
}

interface MetaKeywordFilter {
    tagType: MetaType
    search?: string
    limit?: number
}
