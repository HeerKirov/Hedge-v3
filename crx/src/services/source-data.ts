import { SourceDataUpdateForm } from "@/functions/server/api-source-data"
import { server } from "@/functions/server"
import { sessions } from "@/functions/storage"
import { WEBSITES } from "@/functions/sites"
import { notification, NOTIFICATIONS } from "@/services/notification"
import { sendMessageToTab } from "@/services/messages"
import { Result } from "@/utils/primitives"

export const sourceDataManager = {
    /**
     * 向管理器写入一条来源数据。它会被存储在缓存序列中等待使用。写入的data包含Result，因此也包含对错误数据的抛出操作。
     */
    submit(path: {sourceSite: string, sourceId: string}, data: Result<SourceDataUpdateForm, string>): void {
        if(!data.ok) {
            notification({
                title: "来源数据获取异常",
                message: `${path.sourceSite}-${path.sourceId}: 在提取页面来源数据时发生错误。请查看扩展日志。`
            })
            console.error(`[sourceDataManager] Failed to collect source data.`, data.err)
            return
        }
        console.log(`[sourceDataManager] submit source data ${path.sourceSite}-${path.sourceId}.`, data.value)
        sessions.cache.sourceDataStorage.set(path, data.value).finally()
    },
    /**
     * 从管理器请求一条来源数据。管理器会先尝试从缓存中拉取数据，如果没有缓存，则尝试搜寻页面以直接拉取数据。如果这也失败，将返回null。
     */
    async get(path: {sourceSite: string, sourceId: string}): Promise<SourceDataUpdateForm | null> {
        const data = await sessions.cache.sourceDataStorage.get(path)
        if(data !== undefined) return data

        //tips: 偶尔会有一种情况，get获取来源数据时内容为null。尚不清楚原因，没有任何错误抛出，也无法复现。
        //为了解决这个问题，暂且加回了主动拉取的能力，在这种没有数据的情况下主动去页面请求数据。
        console.warn(`[sourceDataManager] ${path.sourceSite}-${path.sourceId} source data not found in cache. Try to pull it from tab.`)
        const website = WEBSITES[path.sourceSite]
        const pagePathNames = website?.sourceDataPages?.(path.sourceId)
        if(pagePathNames === undefined) {
            notification({
                title: "来源数据收集异常",
                message: `${path.sourceSite}-${path.sourceId}: 无法正确生成提取页面的URL。`
            })
            console.warn(`[sourceDataManager] ${path.sourceSite}-${path.sourceId} cannot generate pattern URL.`)
            return null
        }
        const pageURL = website.host.flatMap(host => pagePathNames.map(p => `https://${host}${p}`))
        const tabs = await chrome.tabs.query({currentWindow: true, url: pageURL})
        if(tabs.length <= 0 || tabs[0].id === undefined) {
            notification({
                title: "来源数据收集异常",
                message: `${path.sourceSite}-${path.sourceId}: 未找到用于提取数据的页面。`
            })
            console.warn(`[sourceDataManager] Page '${pageURL}' not found.`)
            return null
        }
        const reportResult = await sendMessageToTab(tabs[0].id, "REPORT_SOURCE_DATA", undefined)
        sourceDataManager.submit(path, reportResult)
        return reportResult.ok ? reportResult.value : null
    },
    /**
     * 要求管理器将指定source data上传到服务器。这个函数包含对错误数据的抛出操作，最终只返回一个成功与否的布尔值。
     */
    async collect(options: CollectSourceDataOptions): Promise<boolean> {
        const { sourceSite, sourceId } = options

        if(options.type === "auto") {
            if(await sessions.cache.sourceDataCollected.get({sourceSite, sourceId})) {
                console.log(`[collectSourceData] ${sourceSite}-${sourceId} cached, skip.`)
                //该条数据近期被保存过，因此跳过
                return false
            }

            const retrieve = await server.sourceData.get({sourceSite: sourceSite, sourceId})
            if(retrieve.ok) {
                if(retrieve.data.status === "IGNORED") {
                    //已忽略的数据，不收集
                    await sessions.cache.sourceDataCollected.set({sourceSite, sourceId}, true)
                    console.log(`[collectSourceData] Source data ${sourceSite}-${sourceId} is IGNORED, skip collecting.`)
                    return false
                }else if(retrieve.data.status === "EDITED") {
                    const lastUpdateTime = Date.parse(retrieve.data.updateTime)
                    if(Date.now() - lastUpdateTime < 1000 * 60 * 60 * 24 * 7) {
                        //EDITED状态，依据上次更新时间，在7天以内的不收集
                        await sessions.cache.sourceDataCollected.set({sourceSite, sourceId}, true)
                        console.log(`[collectSourceData] Source data ${sourceSite}-${sourceId} is edited in 7 days, skip collecting.`)
                        return false
                    }
                }
            }else if(retrieve.exception) {
                if(retrieve.exception.code !== "NOT_FOUND") {
                    notification({
                        title: "来源数据收集异常",
                        message: `${sourceSite}-${sourceId}: 在访问数据时报告了一项错误。请查看扩展或核心服务日志。`
                    })
                    console.warn(`[collectSourceData] Source data ${sourceSite}-${sourceId} retrieve failed: ${retrieve.exception.message}`)
                    return false
                }
            }else{
                notification({
                    notificationId: NOTIFICATIONS.AUTO_COLLECT_SERVER_DISCONNECTED,
                    title: "核心服务连接失败",
                    message: "未能成功连接到核心服务。",
                    buttons: [{title: "暂时关闭自动收集"}]
                })
                console.error(`[collectSourceData] Connect error: ${retrieve.exception}`)
                return false
            }
        }

        const sourceData = await sourceDataManager.get({sourceSite, sourceId})
        if(sourceData === null) {
            notification({
                title: "来源数据收集异常",
                message: `${sourceSite}-${sourceId}: 未发现此来源数据的缓存。`
            })
            console.error(`[collectSourceData] Source data ${sourceSite}-${sourceId} upload failed: Cache data not exist.`)
            return false
        }

        const res = await server.sourceData.bulk([{...sourceData, sourceSite, sourceId}])
        if(!res.ok) {
            if(res.exception !== undefined) {
                notification({
                    title: "来源数据收集异常",
                    message: `${sourceSite}-${sourceId}: 数据未能成功写入。请查看扩展或核心服务日志。`
                })
                console.error(`[collectSourceData] Source data ${sourceSite}-${sourceId} upload failed: ${res.exception.message}`)
            }else{
                notification({
                    notificationId: NOTIFICATIONS.AUTO_COLLECT_SERVER_DISCONNECTED,
                    title: "核心服务连接失败",
                    message: "未能成功连接到核心服务，因此无法收集来源数据。",
                    buttons: options.type === "auto" ? [{title: "暂时关闭自动收集"}] : undefined
                })
                console.error(`[collectSourceData] Connect error: ${res.exception}`)
            }
            return false
        }else if(res.data.failed > 0) {
            for(const e of res.data.errors) {
                const [type, info] = e.error.info
                if(type === "site") {
                    notification({
                        title: "来源数据写入失败",
                        message: `来源站点${info}不存在，因此写入被拒绝。请在Hedge中创建此站点。`
                    })
                }else if(type === "additionalInfo") {
                    notification({
                        title: "来源数据写入失败",
                        message: `来源附加信息字段${info}不存在，因此写入被拒绝。请在Hedge中为站点添加此字段。`
                    })
                }else if(type === "sourceTagType") {
                    notification({
                        title: "来源数据写入失败",
                        message: `标签类型${info.join("、")}未注册，因此写入被拒绝。请在Hedge中为站点添加这些标签类型。`
                    })
                }
            }
            console.error(`[collectSourceData] Source data ${sourceSite}-${sourceId} upload failed: ${res.data.errors.map(e => `${e.error.message}`).join("/")}`)
            return false
        }

        await sessions.cache.sourceDataCollected.set({sourceSite, sourceId}, true)

        if(options.type === "manual") {
            notification({
                title: "来源数据已收集",
                message: `${sourceSite} ${sourceId}已收集完成。`
            })
        }
        console.log(`[collectSourceData] Source data ${sourceSite}-${sourceId} collected.`)
        return true
    }
}

interface CollectSourceDataOptions {
    sourceSite: string
    sourceId: string
    type: "auto" | "manual"
}
