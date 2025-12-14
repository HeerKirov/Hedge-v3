import { createRequest } from "./impl"

export const setting = {
    server: createRequest<ServerOption, never>("/api/setting/server", "GET"),
    sites: createRequest<Site[], never>("/api/setting/source/sites", "GET"),
}

export interface ServerOption {
    /**
     * 后台服务建议使用的端口。
     * null表示没有建议，由它自己选择端口。
     * 使用整数+逗号(,)+横线(-)表示建议的范围。
     * 这个参数没有强制检查，如果写错，则在检测时不生效。
     */
    port: string | null
    /**
     * 后台服务额外的固定Token。
     * 此Token与生成Token并行可用。使用此Token可在其他位置访问后台服务。
     */
    token: string | null
    /**
     * 在各处有关日期的判定中，每天的日期范围的推迟时间量。
     */
    timeOffsetHour: number | null
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