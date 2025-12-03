 import { useEffect, useState } from "react"
import { SourceDataPath } from "@/functions/server/api-all"
import { SourceDataCollectStatus } from "@/functions/server/api-source-data"
import { WEBSITES } from "@/functions/sites"
import { server } from "@/functions/server"
import { sendMessage } from "@/functions/messages"
import { TabState } from "@/hooks/tabs"
import { setActiveTabBadgeByStatus } from "@/services/active-tab"
import { sendMessageToTab } from "@/services/messages"
import { useAsyncLoading } from "@/utils/reactivity"

export interface SourceInfo {
    tabId: number
    siteName: string
    host: string
    sourceDataPath: SourceDataPath | null
}

/**
 * 解析当前页面是否属于受支持的网站，提供网站host，以及解析来源数据ID。
 */
export function useTabSourceInfo(tabState: TabState) {
    const [sourceInfo, setSourceInfo] = useState<SourceInfo | null>(null)

    const [collectStatus, setCollectStatus] = useState<SourceDataCollectStatus | null>(null)

    const refreshCollectStatus = async (sourceInfo: SourceInfo | null) => {
        if(sourceInfo && sourceInfo.sourceDataPath) {
            const res = await server.sourceData.getCollectStatus([sourceInfo.sourceDataPath])
            if(res.ok) {
                const [collectStatus] = res.data
                setCollectStatus(collectStatus)
                setActiveTabBadgeByStatus(sourceInfo.tabId, collectStatus)
            }else{
                setCollectStatus(null)
            }
        }else{
            setCollectStatus(null)
        }
    }

    const manualCollectSourceData = async () => {
        if(sourceInfo !== null && sourceInfo.sourceDataPath !== null) {
            const { sourceDataPath: { sourceSite, sourceId } } = sourceInfo
            const ok = await sendMessage("COLLECT_SOURCE_DATA", {sourceSite, sourceId})
            if(ok) refreshCollectStatus(sourceInfo).finally()
        }
    }

    const quickFind = () => {
        if(sourceInfo !== null) {
            sendMessageToTab(sourceInfo.tabId, "QUICK_FIND_SIMILAR", undefined)
            //关闭popup窗口
            window.close()
        }
    }

    useEffect(() => {
        if(tabState.tabId && tabState.url) {
            const url = new URL(tabState.url)
            matchTabSourceData(tabState.tabId, url).then(sourceInfo => {
                refreshCollectStatus(sourceInfo).finally()
                setSourceInfo(sourceInfo)
            })
        }else{
            setSourceInfo(null)
        }
    }, [tabState])

    return {sourceInfo, collectStatus, manualCollectSourceData, quickFind}
}

/**
 * 解析URL，分析它属于哪个来源网站，并获取其来源数据信息。
 */
async function matchTabSourceData(tabId: number, url: URL): Promise<{tabId: number, siteName: string, host: string, sourceDataPath: SourceDataPath | null} | null> {
    for(const siteName in WEBSITES) {
        const site = WEBSITES[siteName]
        if(site.host.some(host => typeof host === "string" ? host === url.host : host.test(url.host))) {
            if(site.activeTabPages && site.activeTabPages.some(i => i.test(url.pathname))) {
                const pageInfo = await sendMessageToTab(tabId, "REPORT_PAGE_INFO", undefined)
                if(pageInfo?.path) {
                    return {tabId, siteName, host: url.host, sourceDataPath: pageInfo.path}
                }
            }
            return {tabId, siteName, host: url.host, sourceDataPath: null}
        }
    }
    return null
}
