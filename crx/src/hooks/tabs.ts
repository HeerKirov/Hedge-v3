import { useAsyncLoading } from "@/utils/reactivity"
import { useEffect, useRef, useState } from "react"

export interface TabState {
    status: `${chrome.tabs.TabStatus}`
    tabId: number | undefined
    url: string | undefined
    windowId: number | undefined
}

/**
 * 获取当前激活的标签页状态。该状态会响应onActivated和onUpdated事件，进行动态改变。
 */
export function useTabState() {
    const windowIdRef = useRef<number | undefined>(undefined)
    const [tabState, setTabState] = useState<TabState>({status: "unloaded", tabId: undefined, url: undefined, windowId: undefined})

    useEffect(() => {
        chrome.windows.getCurrent().then(window => windowIdRef.current = window.id)
    }, [])

    useEffect(() => {
        chrome.tabs.query({currentWindow: true, active: true}).then(tabs => {
            if(tabs.length > 0 && tabs[0].id && tabs[0].id !== chrome.tabs.TAB_ID_NONE) {
                setTabState({status: tabs[0].status ?? "unloaded", tabId: tabs[0].id, url: tabs[0].url, windowId: tabs[0].windowId})
            }
        })

        const activatedEventHandler = (activeInfo: chrome.tabs.OnActivatedInfo) => {
            if(activeInfo.windowId === windowIdRef.current) {
                chrome.tabs.get(activeInfo.tabId).then((tab) => {
                    setTabState({status: tab.status ?? "unloaded", tabId: tab.id, url: tab.url, windowId: windowIdRef.current})
                })
            }
        }

        const updatedEventHandler = (tabId: number, changeInfo: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab) => {
            if((changeInfo.url || changeInfo.status) && tab.windowId === windowIdRef.current && tab.active && tabId !== chrome.tabs.TAB_ID_NONE) {
                setTabState({status: tab.status ?? "unloaded", tabId, url: tab.url, windowId: windowIdRef.current})
            }
        }

        chrome.tabs.onActivated.addListener(activatedEventHandler)
        chrome.tabs.onUpdated.addListener(updatedEventHandler)
        
        return () => {
            chrome.tabs.onActivated.removeListener(activatedEventHandler)
            chrome.tabs.onUpdated.removeListener(updatedEventHandler)
        }
    }, [])

    return tabState
}

/**
 * 获取当前标签页的状态。该获取是一次性的，一旦加载完毕就不会再更改。
 */
export function useTabStateOnce() {
    const [tabState] = useAsyncLoading<TabState>({
        default: {status: "unloaded", tabId: undefined, url: undefined, windowId: undefined},
        call: async () => {
            const tabs = await chrome.tabs.query({currentWindow: true, active: true})
            if(tabs.length > 0 && tabs[0].id && tabs[0].id !== chrome.tabs.TAB_ID_NONE) {
                return {status: tabs[0].status ?? "unloaded", tabId: tabs[0].id, url: tabs[0].url, windowId: tabs[0].windowId} as const
            }
            return {status: "unloaded", tabId: undefined, url: undefined, windowId: undefined} as const
        }
    })

    return tabState
}