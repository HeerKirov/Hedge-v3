import { HttpInstance, Response } from "../instance"

export function createSettingQueryEndpoint(http: HttpInstance): SettingQueryEndpoint {
    return {
        get: http.createRequest("/api/setting/query"),
        update: http.createDataRequest("/api/setting/query", "PATCH")
    }
}

/**
 * 设置：查询相关的选项。
 * @permission only client
 */
export interface SettingQueryEndpoint {
    /**
     * 查看。
     */
    get(): Promise<Response<QueryOption>>
    /**
     * 更改。
     */
    update(form: QueryOptionUpdateForm): Promise<Response<unknown>>
}

export interface QueryOption {
    /**
     * 识别中文字符。
     */
    chineseSymbolReflect: boolean
    /**
     * 将有限字符串中的下划线转义为空格。
     */
    translateUnderscoreToSpace: boolean
    /**
     * 查询元数据库中的标签项时，每一次查询的数量上限。
     * @min 1
     */
    queryLimitOfQueryItems: number
    /**
     * 每一个项中的元素总数的警告阈值。
     * @min 2
     */
    warningLimitOfUnionItems: number
    /**
     * 总项数的警告阈值。
     * @min 2
     */
    warningLimitOfIntersectItems: number
}

export interface QueryOptionUpdateForm {
    chineseSymbolReflect?: boolean
    translateUnderscoreToSpace?: boolean
    queryLimitOfQueryItems?: number
    warningLimitOfUnionItems?: number
    warningLimitOfIntersectItems?: number
}
