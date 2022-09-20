import { HttpInstance, Response } from "../instance"
import { AlreadyExists, CascadeResourceExists, NotFound } from "../exceptions"

export function createSettingSourceEndpoint(http: HttpInstance): SettingSourceEndpoint {
    return {
        site: {
            list: http.createRequest("/api/setting/source/sites"),
            create: http.createDataRequest("/api/setting/source/sites", "POST"),
            get: http.createPathRequest(name => `/api/setting/source/sites/${encodeURIComponent(name)}`),
            update: http.createPathDataRequest(name => `/api/setting/source/sites/${encodeURIComponent(name)}`, "PUT"),
            delete: http.createPathRequest(name => `/api/setting/source/sites/${encodeURIComponent(name)}`, "DELETE"),
        }
    }
}

/**
 * 设置：来源数据相关的选项。
 * @permission only client
 */
export interface SettingSourceEndpoint {
    /**
     * 来源网站列表。
     */
    site: {
        /**
         * 查看列表。
         */
        list(): Promise<Response<Site[]>>
        /**
         * 新增一个来源网站。
         * @exception ALREADY_EXISTS
         */
        create(form: SiteCreateForm): Promise<Response<unknown, AlreadyExists<"site", "name", string>>>
        /**
         * 查看单个项。
         * @exception NOT_FOUND 此项不存在。
         */
        get(name: string): Promise<Response<Site, NotFound>>
        /**
         * 更改项。
         * @exception NOT_FOUND 此项不存在。
         */
        update(name: string, form: SiteUpdateForm): Promise<Response<unknown>>
        /**
         * 删除项。
         * @exception NOT_FOUND 此项不存在。
         * @exception CASCADE_RESOURCE_EXISTS("Illust"|"ImportImage"|"SourceAnalyseRule") 存在级联资源，无法删除。
         */
        delete(name: string): Promise<Response<unknown, CascadeResourceExists<"Illust" | "ImportImage" | "SourceAnalyseRule">>>
    }
}

export interface Site {
    /**
     * 网站的识别名称。
     */
    name: string
    /**
     * 网站的显示名称。
     */
    title: string
    /**
     * 此网站是否拥有secondary id。
     * @default false
     */
    hasSecondaryId: boolean
}

export interface SiteCreateForm {
    name: string
    title: string
    hasSecondaryId?: boolean
    /**
     * 在列表中的排序顺序，从0开始。
     * @default 追加到末尾
     */
    ordinal?: number
}

export interface SiteUpdateForm {
    title?: string
    ordinal?: number
}
