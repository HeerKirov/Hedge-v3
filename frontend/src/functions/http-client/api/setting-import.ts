import { HttpInstance, Response } from "../instance"
import { InvalidRuleIndexError, ResourceNotExist } from "../exceptions"

export function createSettingImportEndpoint(http: HttpInstance): SettingImportEndpoint {
    return {
        get: http.createRequest("/api/setting/import"),
        update: http.createDataRequest("/api/setting/import", "PATCH")
    }
}

/**
 * 设置：导入相关选项。
 * @permission only client
 */
export interface SettingImportEndpoint {
    /**
     * 查看。
     */
    get(): Promise<Response<ImportOption>>
    /**
     * 更改。
     * @exception NOT_EXIST("site", siteName) rules[].site不在sites列表中存在时报告此错误。
     * @exception INVALID_RULE_INDEX rules[].secondaryIdIndex与对应的site的hasSecondaryId配置不匹配时报告此错误。
     */
    update(form: ImportOptionUpdateForm): Promise<Response<unknown, ResourceNotExist<"site", string> | InvalidRuleIndexError>>
}

export interface ImportOption {
    /**
     * 导入时，自动从文件分析source信息。
     */
    autoAnalyseSourceData: boolean
    /**
     * 导入时，自动设定meta tag的tagme。
     */
    setTagmeOfTag: boolean
    /**
     * 导入时，根据情况自动设定source的tagme。
     */
    setTagmeOfSource: boolean
    /**
     * 导入时，使用哪种属性设置create time。
     */
    setOrderTimeBy: OrderTimeType
    /**
     * 分区的延后时间，单位毫秒。null等同0。
     * @range [-86400000, 86400000]
     */
    setPartitionTimeDelay: number | null
    /**
     * source分析的规则列表。
     */
    sourceAnalyseRules: SourceAnalyseRule[]
}

export interface ImportOptionUpdateForm {
    autoAnalyseMeta?: boolean
    setTagmeOfTag?: boolean
    setTagmeOfSource?: boolean
    setTimeBy?: OrderTimeType
    setPartitionTimeDelay?: number | null
    sourceAnalyseRules?: SourceAnalyseRule[]
}

/**
 * 用来设定order time的时间属性。
 */
export type OrderTimeType = "IMPORT_TIME" | "CREATE_TIME" | "UPDATE_TIME"

/**
 * 一条source解析规则。
 */
export interface SourceAnalyseRule {
    site: string
    regex: string
    idIndex: number
    secondaryIdIndex: number | null
}
