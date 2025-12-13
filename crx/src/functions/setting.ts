import { version } from "@/../package.json"
import { Migrate, migrate } from "@/utils/migrations"

/**
 * 所有的设置项。
 */
export interface Setting {
    version: string
    general: General
    website: Website
    toolkit: Toolkit
    extension: Extension
}

/**
 * 一般设置项。
 */
interface General {
    /**
     * 要连接到的后端地址。
     */
    host: string
    /**
     * 连接到后端时使用的token。
     */
    token: string
}

/**
 * 网站增强扩展功能，为每个站点提供一些网站UI等方面的体验增强。
 */
interface Website {
    /**
     * sankakucomplex的扩展工具。
     */
    sankakucomplex: {
        /**
         * 启用UI优化。
         */
        enableUIOptimize: boolean
        /**
         * 增强翻页。
         */
        enablePaginationEnhancement: boolean
        /**
         * 屏蔽广告和冗余UI。
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
         * 启用"下载重命名脚本"功能项。
         */
        enableRenameScript: boolean
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
    /**
     * fanbox的扩展工具。
     */
    fanbox: {
        /**
         * 启用UI优化。
         */
        enableUIOptimize: boolean
    }
    /**
     * kemono的扩展工具。
     */
    kemono: {
        /**
         * 启用内嵌链接自动替换。
         */
        enableLinkReplace: boolean
        /**
         * 启用附件下载链接优化。
         */
        enableAttachmentLinkRename: boolean
    }
}

/**
 * 扩展工具功能，提供通用于各个站点的功能类工具。
 */
interface Toolkit {
    /**
     * 下载工具栏。在图像页面附加在可下载图像附近的工具栏，提示其页码，并可点击下载图像。
     */
    downloadToolbar: {
        /**
         * 全局启用此功能。
         */
        enabled: boolean
        /**
         * 在点击下载时，一同收集来源数据。
         */
        autoCollectSourceData: boolean
    }
    /**
     * 在下载文件时对其进行重命名。此下载功能与图像工具栏的下载功能无关，仅作为备用功能。
     */
    determiningFilename: {
        /**
         * 全局启用此功能。
         */
        enabled: boolean
        /**
         * 启用针对附件类文件的标注重命名功能。
         */
        enabledAttachment: boolean
        /**
         * 启用Referrer Policy注入。
         */
        referrerPolicy: boolean
        /**
         * 在匹配的内置规则生效时，一同收集来源数据。
         */
        autoCollectSourceData: boolean
        /**
         * 额外的扩展名支持列表。
         */
        extensions: string[]
        /**
         * 自订规则列表。
         */
        rules: {
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
    }
}

/**
 * 扩展选项功能，提供扩展的一些选项功能。
 */
interface Extension {
    /**
     * 边栏相关功能。
     */
    sidePanel: {
        /**
         * 通过点击Action按钮打开边栏。
         */
        openByActionButton: boolean
        /**
         * 启用服务器状态显示。
         */
        enableServerStatus: boolean
        /**
         * 启用书签面板。
         */
        enableBookmark: boolean
        /**
         * 启用来源信息显示。
         */
        enableSourceInfo: boolean
        /**
         * 启用下载项管理器。
         */
        enableDownloadManager: boolean
    }
    /**
     * 书签管理器选项。
     */
    bookmarkManager: {
        /**
         * 排除的域名列表。
         */
        excludeDomains: string[]
        /**
         * 启用的域名列表。
         */
        includeDomains: string[]
    }
    /**
     * 下载项管理器选项。
     */
    downloadManager: {
        /**
         * 清除按钮的操作。
         */
        clearButtonAction: "CANCELLED_AND_DELETED" | "CANCELLED_AND_COMPLETE" | "ALL_NOT_PROGRESSING"
        /**
         * 自动清除。
         */
        autoClear: boolean
        /**
         * 自动清除间隔。
         */
        autoClearIntervalSec: number
        /**
         * 自动清除操作。
         */
        autoClearAction: "CANCELLED_AND_DELETED" | "CANCELLED_AND_COMPLETE" | "ALL_NOT_PROGRESSING"
    }
}

export function defaultSetting(): Setting {
    return {
        version,
        general: {
            host: "localhost:9000",
            token: "dev"
        },
        website: {
            sankakucomplex: {
                enableUIOptimize: true,
                enablePaginationEnhancement: true,
                enableBlockAds: true
            },
            ehentai: {
                enableUIOptimize: true,
                enableRenameScript: true,
                enableCommentCNBlock: true,
                enableCommentVoteBlock: true,
                enableCommentKeywordBlock: true,
                enableCommentUserBlock: true,
                commentBlockKeywords: [],
                commentBlockUsers: []
            },
            fanbox: {
                enableUIOptimize: true,
            },
            kemono: {
                enableLinkReplace: true,
                enableAttachmentLinkRename: true,
            }
        },
        toolkit: {
            downloadToolbar: {
                enabled: true,
                autoCollectSourceData: true
            },
            determiningFilename: {
                enabled: true,
                enabledAttachment: true,
                referrerPolicy: true,
                autoCollectSourceData: true,
                rules: [],
                extensions: []
            }
        },
        extension: {
            sidePanel: {
                openByActionButton: false,
                enableServerStatus: false,
                enableBookmark: true,
                enableSourceInfo: true,
                enableDownloadManager: true
            },
            bookmarkManager: {
                excludeDomains: [],
                includeDomains: []
            },
            downloadManager: {
                clearButtonAction: "CANCELLED_AND_DELETED",
                autoClear: false,
                autoClearIntervalSec: 30,
                autoClearAction: "CANCELLED_AND_DELETED"
            }
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

    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: r?.extension.sidePanel.openByActionButton })
}

export const settings = {
    async get(): Promise<Setting> {
        const r = (await chrome.storage.local.get(["setting"]))["setting"] as Setting | undefined
        return r ?? defaultSetting()
    },
    async set(setting: Setting, oldSetting?: Setting) {
        await chrome.storage.local.set({ "setting": setting })
        if(oldSetting === undefined || oldSetting.extension.sidePanel.openByActionButton !== setting.extension.sidePanel.openByActionButton) {
            await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: setting.extension.sidePanel.openByActionButton })
        }
    },
    async importAndMigrate(content: any) {
        const { setting } = await migrate({setting: content}, migrations, {
            set(context, v) {
                context.setting.version = v
            },
            get(context) {
                return context.setting.version
            }
        })
        await chrome.storage.local.set({ "setting": setting })
        console.log(`[setting] version ${setting.version}.`)
    }
}

const migrations: {[version: string]: Migrate<MigrateContext>} = {
    async "0.1.0"() {/*v0.1.0的占位符。只为将版本号升级到v0.1.0*/},
    async "0.2.0"(ctx) {
        const val = ctx.setting as any
        val["tool"]["ehentai"]["enableUIOptimize"] = val["tool"]["ehentai"]["enableUIOptimize"] ?? val["tool"]["ehentai"]["enableImageDownloadAnchor"]
    },
    async "0.3.0"(ctx) {
        const val = ctx.setting as any
        val["server"]["host"] = val["server"]["host"] ?? `localhost:${val["server"]["port"]}`
    },
    async "0.10.0"(ctx) {
        const val = ctx.setting as any
        val["general"] = val["server"]
        val["website"] = {
            sankakucomplex: {
                enableUIOptimize: val["tool"]["sankakucomplex"]["enableShortcutForbidden"],
                enablePaginationEnhancement: val["tool"]["sankakucomplex"]["enablePaginationEnhancement"],
                enableBlockAds: val["tool"]["sankakucomplex"]["enableBlockAds"]
            },
            ehentai: {
                ...val["tool"]["ehentai"],
                enableRenameScript: true,
            },
            fanbox: {
                enableUIOptimize: true
            }
        }
        val["toolkit"] = {
            downloadToolbar: {
                enabled: true,
                autoCollectSourceData: val["sourceData"]["autoCollectWhenDownload"] ?? true,
            },
            determiningFilename: {
                enabled: !!val["download"]["customRules"]?.length,
                referrerPolicy: true,
                autoCollectSourceData: val["sourceData"]["autoCollectWhenDownload"] ?? true,
                rules: val["download"]["customRules"],
                extensions: val["download"]["customExtensions"]
            }
        }
        delete val["server"]
        delete val["tool"]
        delete val["sourceData"]
    },
    async "0.12.1"(ctx) {
        const val = ctx.setting as any
        val["toolkit"]["determiningFilename"].enabledAttachment = val["toolkit"]["determiningFilename"].enabled
    },
    async "0.14.2"(ctx) {
        const val = ctx.setting as any
        val["website"]["kemono"] = {
            enableLinkReplace: true
        }
    },
    async "0.14.3"(ctx) {
        const val = ctx.setting as any
        val["website"]["kemono"]["enableAttachmentLinkRename"] = true
    },
    async "0.17.0"(ctx) {
        const val = ctx.setting as any
        val["extension"] = {
            sidePanel: {
                openByActionButton: false,
                enableServerStatus: false,
                enableBookmark: true,
                enableSourceInfo: true,
                enableDownloadManager: true
            },
            bookmarkManager: {
                excludeDomains: [],
                includeDomains: []
            },
            downloadManager: {
                clearButtonAction: "CANCELLED_AND_DELETED",
                autoClear: false,
                autoClearIntervalSec: 30,
                autoClearAction: "CANCELLED_AND_DELETED"
            }
        }
    }
}

export interface MigrateContext {
    setting: Setting
}
