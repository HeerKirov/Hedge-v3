import { createRequest } from "./impl"

export const setting = {
    sites: createRequest<Site[], never>("/api/setting/source/sites", "GET")
}

export type SitePartMode = "NO" | "PAGE" | "PAGE_WITH_NAME"

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
     * 此网站是否拥有分页。
     * @default NO
     */
    partMode: SitePartMode
    /**
     * 此网站可接受的元数据条目。
     */
    availableAdditionalInfo: {field: string, label: string}[]
    /**
     * 根据元数据id与附加信息，自动生成links的规则列表。
     */
    sourceLinkGenerateRules: string[]
    /**
     * 此站点可用的标签类型。
     */
    availableTypes: string[]
}