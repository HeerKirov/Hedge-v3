import { HttpInstance, Response } from ".."
import { SimpleFolder } from "./folder"
import { Annotation } from "./annotations"
import { SimpleAuthor, SimpleTopic } from "./all"

export function createUtilSearchEndpoint(http: HttpInstance): UtilSearchEndpoint {
    return {
        history: {
            folders: http.createRequest("/api/utils/picker/history/folders"),
            topics: http.createRequest("/api/utils/picker/history/topics"),
            authors: http.createRequest("/api/utils/picker/history/authors"),
            annotations: http.createRequest("/api/utils/picker/history/annotations"),
            push: http.createDataRequest("/api/utils/picker/history", "POST")
        }
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
         * annotation的最近使用记录。
         */
        annotations(): Promise<Response<Annotation[]>>
        /**
         * 添加最近使用记录。
         */
        push(form: HistoryPushForm): Promise<Response<null>>
    }
}

interface HistoryPushForm {
    type: "FOLDER" | "TOPIC" | "AUTHOR" | "ANNOTATION"
    id: number
}

