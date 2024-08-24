import { sendMessageToTab } from "@/services/messages"
import { Setting } from "@/functions/setting"
import { SourceDataUpdateForm } from "@/functions/server/api-source-data"
import { server } from "@/functions/server"
import { sessions } from "@/functions/storage"
import { EHENTAI_CONSTANTS, PIXIV_CONSTANTS, SANKAKUCOMPLEX_CONSTANTS, SOURCE_DATA_COLLECT_SITES } from "@/functions/sites"
import { NOTIFICATIONS } from "@/services/notification"
import { Result } from "@/utils/primitives"

type CollectSourceDataOptions = ({sourceId: string, args?: undefined} | {args: Record<string, string>, sourceId?: undefined}) & {
    siteName: string
    setting: Setting
    autoCollect?: boolean
}

/**
 * 自动收集指定来源的数据的调用函数。包含开启条件判断。
 */
export async function autoCollectSourceData(options: CollectSourceDataOptions) {
    if(options.setting.sourceData.autoCollectWhenDownload && !await sessions.cache.closeAutoCollect()) await collectSourceData({...options, autoCollect: true})
}

/**
 * 收集指定来源的数据。完成数据收集后，直接上传到后端。
 * sourceId/args二者需要给出其一。给出args时，根据默认参数从args中提取sourceId。
 * skipCheckingCache指定为true时，跳过所有缓存检查，必定收集数据。
 */
export async function collectSourceData({ siteName, setting, ...options }: CollectSourceDataOptions): Promise<boolean> {
    const rule = SOURCE_DATA_COLLECT_SITES[siteName]
    if(rule === undefined) {
        console.log(`[collectSourceData] '${siteName}' no this rule, skip.`)
        //没有对应名称的规则，因此跳过
        return false
    }
    const overrideRule = setting.sourceData.overrideRules[siteName]
    if(overrideRule && !overrideRule.enable) {
        console.log(`[collectSourceData] '${siteName}' is disabled, skip.`)
        //该规则已被禁用，因此跳过
        return false
    }
    const generator = SOURCE_DATA_RULES[siteName]

    const sourceSite = (overrideRule ?? rule).sourceSite
    let sourceId: string
    if(options.sourceId !== undefined) {
        sourceId = options.sourceId
    }else{
        sourceId = options.args[generator.sourceId]
        if(!sourceId) {
            console.error(`[collectSourceData] ${sourceSite}-${options.args[generator.sourceId]} source id analyse failed.`)
            return false
        }
    }

    if(options.autoCollect) {
        if(await sessions.cache.sourceDataCollected.get({site: sourceSite, sourceId})) {
            console.log(`[collectSourceData] ${sourceSite}-${sourceId} cached, skip.`)
            //该条数据近期被保存过，因此跳过
            return false
        }

        const retrieve = await server.sourceData.get({sourceSite: sourceSite, sourceId})
        if(retrieve.ok) {
            if(retrieve.data.status === "IGNORED") {
                //已忽略的数据，不收集
                await sessions.cache.sourceDataCollected.set({site: sourceSite, sourceId}, true)
                console.log(`[collectSourceData] Source data ${sourceSite}-${sourceId} is IGNORED, skip collecting.`)
                return false
            }else if(retrieve.data.status === "EDITED") {
                const lastUpdateTime = Date.parse(retrieve.data.updateTime)
                if(Date.now() - lastUpdateTime < 1000 * 60 * 60 * 24 * 7) {
                    //EDITED状态，依据上次更新时间，在7天以内的不收集
                    await sessions.cache.sourceDataCollected.set({site: sourceSite, sourceId}, true)
                    console.log(`[collectSourceData] Source data ${sourceSite}-${sourceId} is edited in 7 days, skip collecting.`)
                    return false
                }
            }
        }else if(retrieve.exception) {
            if(retrieve.exception.code !== "NOT_FOUND") {
                chrome.notifications.create({
                    type: "basic",
                    iconUrl: "/public/favicon.png",
                    title: "来源数据收集异常",
                    message: `${sourceSite}-${sourceId}: 在访问数据时报告了一项错误。请查看扩展或核心服务日志。`
                })
                console.warn(`[collectSourceData] Source data ${sourceSite}-${sourceId} retrieve failed: ${retrieve.exception.message}`)
                return false
            }
        }else{
            chrome.notifications.create(NOTIFICATIONS.AUTO_COLLECT_SERVER_DISCONNECTED, {
                type: "basic",
                iconUrl: "/public/favicon.png",
                title: "核心服务连接失败",
                message: "未能成功连接到核心服务。",
                buttons: [{title: "暂时关闭自动收集"}]
            })
            console.error(`[collectSourceData] Connect error: ${retrieve.exception}`)
            return false
        }
    }

    const patternResult = generator.pattern(sourceId)
    const pageURL = typeof patternResult === "string" ? patternResult : await patternResult
    if(pageURL === null) {
        chrome.notifications.create({
            type: "basic",
            iconUrl: "/public/favicon.png",
            title: "来源数据收集异常",
            message: `${sourceSite}-${sourceId}: 无法正确生成提取页面的URL。`
        })
        console.warn(`[collectSourceData] ${sourceSite}-${sourceId} Cannot generate pattern URL.`)
        return false
    }
    const tabs = await chrome.tabs.query({currentWindow: true, url: pageURL})
    if(tabs.length <= 0 || tabs[0].id === undefined) {
        chrome.notifications.create({
            type: "basic",
            iconUrl: "/public/favicon.png",
            title: "来源数据收集异常",
            message: `${sourceSite}-${sourceId}: 未找到用于提取数据的页面。`
        })
        console.warn(`[collectSourceData] Page '${pageURL}' not found.`)
        return false
    }

    const reportResult = await sendMessageToTab(tabs[0].id, "REPORT_SOURCE_DATA", undefined)
    if(!reportResult.ok) {
        chrome.notifications.create({
            type: "basic",
            iconUrl: "/public/favicon.png",
            title: "来源数据收集异常",
            message: `${sourceSite}-${sourceId}: 在提取页面收集数据时发生错误。请查看扩展日志。`
        })
        console.error(`[collectSourceData] Page '${pageURL}' failed to collect source data.`, reportResult.err)
        return false
    }
    const res = await server.sourceData.bulk([{...reportResult.value, sourceSite, sourceId}])
    if(!res.ok) {
        if(res.exception !== undefined) {
            chrome.notifications.create({
                type: "basic",
                iconUrl: "/public/favicon.png",
                title: "来源数据收集异常",
                message: `${sourceSite}-${sourceId}: 数据未能成功写入。请查看扩展或核心服务日志。`
            })
            console.error(`[collectSourceData] Source data ${sourceSite}-${sourceId} upload failed: ${res.exception.message}`)
        }else{
            chrome.notifications.create(NOTIFICATIONS.AUTO_COLLECT_SERVER_DISCONNECTED, {
                type: "basic",
                iconUrl: "/public/favicon.png",
                title: "核心服务连接失败",
                message: "未能成功连接到核心服务。",
                buttons: options.autoCollect ? [{title: "暂时关闭自动收集"}] : undefined
            })
            console.error(`[collectSourceData] Connect error: ${res.exception}`)
        }
        return false
    }else if(res.data.failed > 0) {
        for(const e of res.data.errors) {
            const [type, info] = e.error.info
            if(type === "site") {
                chrome.notifications.create({
                    type: "basic",
                    iconUrl: "/public/favicon.png",
                    title: "来源数据写入失败",
                    message: `来源站点${info}不存在，因此写入被拒绝。请在Hedge中创建此站点。`
                })
            }else if(type === "additionalInfo") {
                chrome.notifications.create({
                    type: "basic",
                    iconUrl: "/public/favicon.png",
                    title: "来源数据写入失败",
                    message: `来源附加信息字段${info}不存在，因此写入被拒绝。请在Hedge中为站点添加此字段。`
                })
            }else if(type === "sourceTagType") {
                chrome.notifications.create({
                    type: "basic",
                    iconUrl: "/public/favicon.png",
                    title: "来源数据写入失败",
                    message: `标签类型${info.join("、")}未注册，因此写入被拒绝。请在Hedge中为站点添加这些标签类型。`
                })
            }
        }
        console.error(`[collectSourceData] Source data ${sourceSite}-${sourceId} upload failed: ${res.data.errors.map(e => `${e.error.message}`).join("/")}`)
        return false
    }

    await sessions.cache.sourceDataCollected.set({site: sourceSite, sourceId}, true)

    if(!options.autoCollect) {
        chrome.notifications.create({
            type: "basic",
            iconUrl: "/public/favicon.png",
            title: "来源数据已收集",
            message: `${sourceSite} ${sourceId}已收集完成。`
        })
    }
    console.log(`[collectSourceData] Source data ${sourceSite}-${sourceId} collected.`)
    return true
}

export async function getSourceData(siteName: string, sourceId: string): Promise<Result<SourceDataUpdateForm, string>> {
    const generator = SOURCE_DATA_RULES[siteName]
    const patternResult = generator.pattern(sourceId)
    const pageURL = typeof patternResult === "string" ? patternResult : await patternResult
    if(pageURL === null) {
        return {ok: false, err: "Cannot generate pattern URL."}
    }
    const tabs = await chrome.tabs.query({currentWindow: true, url: pageURL})
    if(tabs.length <= 0 || tabs[0].id === undefined) {
        return {ok: false, err: `Page ${pageURL} not found.`}
    }
    return await sendMessageToTab(tabs[0].id, "REPORT_SOURCE_DATA", undefined)
}

/**
 * 来源数据收集时的一些规则，包括：从args中的什么字段提取sourceId；根据sourceId如何匹配URL(用于chrome.tabs.query)，以找到要收集数据的页面。
 */
const SOURCE_DATA_RULES: Record<string, SourceDataRule> = {
    "sankakucomplex": {
        sourceId: "PID",
        pattern: SANKAKUCOMPLEX_CONSTANTS.PATTERNS.POST_URL
    },
    "ehentai": {
        sourceId: "GID",
        pattern: EHENTAI_CONSTANTS.PATTERNS.GALLERY_URL
    },
    "pixiv": {
        sourceId: "PID",
        pattern: PIXIV_CONSTANTS.PATTERNS.ARTWORK_URL
    }
}

interface SourceDataRule {
    sourceId: string
    pattern(sourceId: string): string | string[] | null | Promise<string | string[] | null>
}
