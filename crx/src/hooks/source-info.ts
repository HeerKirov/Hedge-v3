 import { useCallback, useEffect, useMemo, useState } from "react"
import { SourceDataPath } from "@/functions/server/api-all"
import { SourceDataCollectStatus, SourceTag } from "@/functions/server/api-source-data"
import { SourceMappingTargetDetail } from "@/functions/server/api-source-tag-mapping"
import { server } from "@/functions/server"
import { sendMessage } from "@/functions/messages"
import { TabState } from "@/hooks/tabs"
import { setActiveTabBadgeByStatus } from "@/services/active-tab"
import { sendMessageToTab } from "@/services/messages"
import { sleep } from "@/utils/primitives"

export interface ImageSourceInfo {
    tabId: number
    host: string
    sourceDataPath: SourceDataPath
}

/**
 * 对于列表类型页面，根据其agent，查找其来源标签的映射情况。
 */
export function useAgentSourceInfo(tabState: TabState) {
    const [agent, setAgent] = useState<SourceTag | null>(null)
    const [agentSite, setAgentSite] = useState<string | null>(null)
    const [mappings, setMappings] = useState<SourceMappingTargetDetail[]>([])

    useEffect(() => {
        if(tabState.status === "complete" && tabState.tabId) {
            const tabId = tabState.tabId
            getTabAgentData(tabId).then(async agent => {
                setAgent(agent?.agent ?? null)
                setAgentSite(agent?.agentSite ?? null)
                if(agent && agent.agent) {
                    const res = await server.sourceTagMapping.get({sourceSite: agent.agentSite, sourceTagType: agent.agent.type, sourceTagCode: agent.agent.code})
                    if(res.ok) setMappings(res.data)
                }else{
                    setMappings([])
                }
            }).catch(e => console.error(e))
        }
    }, [tabState.status, tabState.tabId])

    return {agent, agentSite, mappings}
}

/**
 * 对于图像类型页面，根据其来源ID，查找其来源和图像的收集情况。
 */
export function useImageSourceInfo(tabState: TabState, scene?: "popup" | "sidePanel") {
    const [sourceInfo, setSourceInfo] = useState<ImageSourceInfo | null>(null)

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
            const tabId = tabState.tabId
            const url = new URL(urlWithoutHash)
            getTabSourceData(tabState.tabId).then(sourceDataPath => {
                refreshCollectStatus(sourceDataPath).catch(e => console.error(e))
                setSourceInfo(sourceDataPath ? {tabId, host: url.host, sourceDataPath} : null)
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
 * 获取当前tab的来源标签信息。
 */
async function getTabAgentData(tabId: number): Promise<{agent: SourceTag | null, agentSite: string} | null> {
    try {
        const res = await sendMessageToTab(tabId, "REPORT_ARTWORKS_INFO", undefined)
        if(res.ok) {
            return res.value
        }else{
            console.warn("[getTabAgentData] Failed to get agent data from tab.", res.err)
        }
    } catch (e) {
        if(e instanceof Error && e.message.includes("Could not establish connection. Receiving end does not exist.")) {
            console.log("[getTabAgentData] Tab is not ready. Retry after 500ms.")
            await sleep(500)
            const res = await sendMessageToTab(tabId, "REPORT_ARTWORKS_INFO", undefined)
            if(res.ok) {
                return res.value
            }else{
                console.warn("[getTabAgentData] Failed to get agent data from tab.", res.err)
            }
        }else{
            throw e
        }
    }
    return null
}

/**
 * 获取当前tab的来源数据信息。
 */
async function getTabSourceData(tabId: number): Promise<SourceDataPath | null> {
    try {
        const pageInfo = await sendMessageToTab(tabId, "REPORT_PAGE_INFO", undefined)
        if(pageInfo?.path) {
            return pageInfo.path
        }
    } catch (e) {
        if(e instanceof Error && e.message.includes("Could not establish connection. Receiving end does not exist.")) {
            console.log("[getTabSourceData] Tab is not ready. Retry after 500ms.")
            await sleep(500)
            const pageInfo = await sendMessageToTab(tabId, "REPORT_PAGE_INFO", undefined)
            if(pageInfo?.path) {
                return pageInfo.path
            }
        }else{
            throw e
        }
    }
    return null
}
