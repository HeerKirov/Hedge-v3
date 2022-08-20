import { HttpInstance, Response } from "../instance"
import { TaskConfig } from "./find-similar"

export function createSettingFindSimilarEndpoint(http: HttpInstance): SettingFindSimilarEndpoint {
    return {
        get: http.createRequest("/api/setting/find-similar"),
        update: http.createDataRequest("/api/setting/find-similar", "PATCH")
    }
}

/**
 * 设置：相关项查找相关选项。
 * @permission only client
 */
export interface SettingFindSimilarEndpoint {
    /**
     * 查看。
     */
    get(): Promise<Response<FindSimilarOption>>
    /**
     * 更改。
     * @exception NOT_EXIST("site", siteName) rules[].site不在sites列表中存在时报告此错误。
     * @exception INVALID_RULE_INDEX rules[].secondaryIdIndex与对应的site的hasSecondaryId配置不匹配时报告此错误。
     */
    update(form: FindSimilarOptionUpdateForm): Promise<Response<unknown>>
}

export interface FindSimilarOption {
    autoFindSimilar: boolean
    autoTaskConf: TaskConfig | null
    defaultTaskConf: TaskConfig
}

export type FindSimilarOptionUpdateForm = Partial<FindSimilarOption>
