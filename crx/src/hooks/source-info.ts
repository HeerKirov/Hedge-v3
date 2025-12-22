 import { useCallback, useEffect, useMemo, useState } from "react"
import { SourceDataPath } from "@/functions/server/api-all"
import { SourceDataCollectStatus } from "@/functions/server/api-source-data"
import { WEBSITES } from "@/functions/sites"
import { server } from "@/functions/server"
import { sendMessage } from "@/functions/messages"
import { TabState } from "@/hooks/tabs"
import { setActiveTabBadgeByStatus } from "@/services/active-tab"
import { sendMessageToTab } from "@/services/messages"
import { sleep } from "@/utils/primitives"

export interface SourceInfo {
    tabId: number
    siteName: string
    host: string
    sourceDataPath: SourceDataPath | null
}

/**
 * 解析当前页面是否属于受支持的网站，提供网站host，以及解析来源数据ID。
 */
export function useTabSourceInfo(tabState: TabState, scene?: "popup" | "sidePanel") {
    const [sourceInfo, setSourceInfo] = useState<SourceInfo | null>(null)

    const urlWithoutHash = useMemo(() => {
        if(tabState.url) {
            try {
                const parsedUrl = new URL(tabState.url)
                parsedUrl.hash = ""
                return parsedUrl.toString()
            } catch {
                return tabState.url
            }
        }
        return undefined
    }, [tabState.url])

    const { collectStatus, refreshCollectStatus, manualCollectSourceData } = useCollectStatusInternal(sourceInfo?.sourceDataPath ?? null, useCallback((_: SourceDataPath | null, collectStatus: SourceDataCollectStatus) => {
        setActiveTabBadgeByStatus(tabState?.tabId ?? -1, collectStatus)
    }, [sourceInfo?.tabId ?? -1]))

    const quickFind = useCallback(() => {
        if(sourceInfo !== null) {
            sendMessageToTab(sourceInfo.tabId, "QUICK_FIND_SIMILAR", undefined)
            //关闭popup窗口
            if(scene === "popup") {
                window.close()
            }
        }
    }, [sourceInfo, scene])

    useEffect(() => {
        if(tabState.status === "complete" && tabState.tabId && urlWithoutHash) {
            const url = new URL(urlWithoutHash)
            matchTabSourceData(tabState.tabId, url).then(sourceInfo => {
                refreshCollectStatus(sourceInfo?.sourceDataPath ?? null).catch(e => console.error(e))
                setSourceInfo(sourceInfo)
            }).catch(e => console.error(e))
        }else{
            setSourceInfo(null)
        }
    }, [tabState.status, tabState.tabId, urlWithoutHash, refreshCollectStatus])

    return {sourceInfo, collectStatus, manualCollectSourceData, quickFind}
}

export function useCollectStatus(sourceDataPath: SourceDataPath | null) {
    const { collectStatus, refreshCollectStatus, manualCollectSourceData } = useCollectStatusInternal(sourceDataPath)

    useEffect(() => {
        if(sourceDataPath) {
            refreshCollectStatus(sourceDataPath).finally()
        }
    }, [sourceDataPath, refreshCollectStatus])


    return {collectStatus, manualCollectSourceData}
}

function useCollectStatusInternal(sourceDataPath: SourceDataPath | null, refreshCallback?: (sourceDataPath: SourceDataPath | null, collectStatus: SourceDataCollectStatus) => void) {
    const [collectStatus, setCollectStatus] = useState<SourceDataCollectStatus | null>(null)

    const refreshCollectStatus = useCallback(async (sourceDataPath: SourceDataPath | null) => {
        if(sourceDataPath) {
            const res = await server.sourceData.getCollectStatus([sourceDataPath])
            if(res.ok) {
                const [collectStatus] = res.data
                setCollectStatus(collectStatus)
                refreshCallback?.(sourceDataPath, collectStatus)
            }else{
                setCollectStatus(null)
            }
        }else{
            setCollectStatus(null)
        }
    }, [])

    const manualCollectSourceData = useCallback(async () => {
        if(sourceDataPath !== null) {
            const { sourceSite, sourceId } = sourceDataPath
            const ok = await sendMessage("COLLECT_SOURCE_DATA", {sourceSite, sourceId})
            if(ok) refreshCollectStatus(sourceDataPath).finally()
        }
    }, [sourceDataPath, refreshCollectStatus])

    return {collectStatus, refreshCollectStatus, manualCollectSourceData}
}

/**
 * 解析URL，分析它属于哪个来源网站，并获取其来源数据信息。
 */
async function matchTabSourceData(tabId: number, url: URL): Promise<{tabId: number, siteName: string, host: string, sourceDataPath: SourceDataPath | null} | null> {
    for(const siteName in WEBSITES) {
        const site = WEBSITES[siteName]
        if(site.host.some(host => typeof host === "string" ? host === url.host : host.test(url.host))) {
            if(site.activeTabPages && site.activeTabPages.some(i => i.test(url.pathname))) {
                try {
                    const pageInfo = await sendMessageToTab(tabId, "REPORT_PAGE_INFO", undefined)
                    if(pageInfo?.path) {
                        return {tabId, siteName, host: url.host, sourceDataPath: pageInfo.path}
                    }
                } catch (e) {
                    if(e instanceof Error && e.message.includes("Could not establish connection. Receiving end does not exist.")) {
                        console.log("[matchTabSourceData] Tab is not ready. Retry after 500ms.")
                        await sleep(500)
                        const pageInfo = await sendMessageToTab(tabId, "REPORT_PAGE_INFO", undefined)
                        if(pageInfo?.path) {
                            return {tabId, siteName, host: url.host, sourceDataPath: pageInfo.path}
                        }
                    }else{
                        throw e
                    }
                }
                
            }
            return {tabId, siteName, host: url.host, sourceDataPath: null}
        }
    }
    return null
}
