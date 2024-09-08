import { version } from "@/../package.json"
import { Migrate, migrate } from "@/utils/migrations"

/**
 * 所有的设置项。
 */
export interface Setting {
    version: string
    server: Server
    tool: Tool
    download: Download
    sourceData: SourceData
}

/**
 * 与后端连接相关的设置项。
 */
interface Server {
    /**
     * 要连接到的后端地址。
     */
    host: string
    /**
     * 连接到后端时使用的token。需要在后端设置项里配置一个常驻token。
     */
    token: string
}

/**
 * 与优化工具相关的设置项。所有功能默认开启。
 */
interface Tool {
    /**
     * sankakucomplex的扩展工具。
     */
    sankakucomplex: {
        /**
         * 屏蔽部分快捷键。
         */
        enableShortcutForbidden: boolean
        /**
         * 增强翻页。
         */
        enablePaginationEnhancement: boolean
        /**
         * 增强标签列表。
         */
        enableTagListEnhancement: boolean
        /**
         * 增强pool列表。
         */
        enableBookNoticeEnhancement: boolean
        /**
         * 替换图像链接。
         */
        enableImageLinkReplacement: boolean
        /**
         * 屏蔽广告和烦人的窗口。
         */
        enableBlockAds: boolean
    }
    /**
     * ehentai的扩展工具。
     */
    ehentai: {
        /**
         * 启用UI优化。
         */
        enableUIOptimize: boolean
        /**
         * 启用评论区中文智能屏蔽。
         */
        enableCommentCNBlock: boolean
        /**
         * 启用评论区低分屏蔽。
         */
        enableCommentVoteBlock: boolean
        /**
         * 启用评论区关键字屏蔽。
         */
        enableCommentKeywordBlock: boolean
        /**
         * 启用评论区用户屏蔽。
         */
        enableCommentUserBlock: boolean
        /**
         * 评论区屏蔽关键字列表。
         */
        commentBlockKeywords: string[]
        /**
         * 评论区屏蔽用户列表。
         */
        commentBlockUsers: string[]
    }
}

/**
 * 与文件下载重命名相关的设置项。
 */
interface Download {
    /**
     * 覆盖固有规则。默认情况下，启用全部固有规则，在这里可以覆盖一部分设置。
     */
    overrideRules: {
        [siteName: string]: {
            /**
             * 是否启用此规则。禁用后，此规则在文件下载提供建议时不再生效。
             */
            enable: boolean
            /**
             * 覆盖：新的rename模板。
             */
            rename: string | null
        }
    }
    /**
     * 追加的自定义规则。
     */
    customRules: {
        /**
         * 重命名模板。
         */
        rename: string
        /**
         * 匹配referrer并获取字段。
         */
        referrer: string | null
        /**
         * 匹配url并获取字段。
         */
        url: string | null
        /**
         * 匹配filename并获取字段。
         */
        filename: string | null
    }[]
    /**
     * 覆盖扩展名支持。默认情况下，使用内置的扩展名列表，在这里可以追加新扩展名。
     */
    customExtensions: string[]
}

/**
 * 与来源数据收集相关的设置项。
 */
interface SourceData {
    /**
     * 在下载文件时，自动收集来源数据。
     */
    autoCollectWhenDownload: boolean
    /**
     * 覆盖固有规则。默认情况下，启用全部固有规则，在这里可以覆盖一部分设置。
     */
    overrideRules: {
        [siteName: string]: {
            /**
             * 是否启用此规则。禁用后，此规则在文件下载后不再自动触发，且禁用此站点的来源数据解析、显示和匹配功能。
             */
            enable: boolean
            /**
             * 映射到Hedge server中的site name。
             */
            sourceSite: string
            /**
             * 映射到Hedge server中的附加信息定义。key为固有信息键名，additionalField为site中的附加信息字段名。
             */
            additionalInfo: Record<string, string>
        } | undefined
    }
}

export function defaultSetting(): Setting {
    return {
        version,
        server: {
            host: "localhost:9000",
            token: "dev"
        },
        tool: {
            sankakucomplex: {
                enableShortcutForbidden: true,
                enableTagListEnhancement: true,
                enablePaginationEnhancement: true,
                enableBookNoticeEnhancement: true,
                enableImageLinkReplacement: true,
                enableBlockAds: true
            },
            ehentai: {
                enableUIOptimize: true,
                enableCommentCNBlock: true,
                enableCommentVoteBlock: true,
                enableCommentKeywordBlock: true,
                enableCommentUserBlock: true,
                commentBlockKeywords: [],
                commentBlockUsers: []
            }
        },
        download: {
            overrideRules: {},
            customRules: [],
            customExtensions: []
        },
        sourceData: {
            autoCollectWhenDownload: false,
            overrideRules: {}
        }
    }
}

export async function initialize(details: chrome.runtime.InstalledDetails) {
    const r = (await chrome.storage.local.get(["setting"]))["setting"] as Setting | undefined
    if(r !== undefined && details.reason !== "install") {
        const { setting, changed } = await migrate({setting: r}, migrations, {
            set(context, v) {
                context.setting.version = v
            },
            get(context) {
                return context.setting.version
            }
        })
        if(changed) {
            await chrome.storage.local.set({ "setting": setting })
        }
        console.log(`[setting] version ${setting.version}.`)
    }else{
        await chrome.storage.local.set({ "setting": defaultSetting() })
    }
}

export const settings = {
    async get(): Promise<Setting> {
        const r = (await chrome.storage.local.get(["setting"]))["setting"] as Setting | undefined
        return r ?? defaultSetting()
    },
    async set(setting: Setting) {
        await chrome.storage.local.set({ "setting": setting })
    }
}

const migrations: {[version: string]: Migrate<MigrateContext>} = {
    async "0.1.0"() {/*v0.1.0的占位符。只为将版本号升级到v0.1.0*/},
    async "0.2.0"(ctx) {
        const oldVal = (ctx.setting.tool.ehentai as any)["enableImageDownloadAnchor"] as boolean
        ctx.setting.tool.ehentai.enableUIOptimize = ctx.setting.tool.ehentai.enableUIOptimize ?? oldVal
    },
    async "0.3.0"(ctx) {
        const oldVal = (ctx.setting.server as any)["port"] as number
        ctx.setting.server.host = ctx.setting.server.host ?? `localhost:${oldVal}`
    }
}

export interface MigrateContext {
    setting: Setting
}
