import { useEffect, useRef, useState } from "react"

interface TabState {
    status: `${chrome.tabs.TabStatus}`
    tabId: number | undefined
    url: string | undefined
    windowId: number | undefined
}

export function useTabState() {
    const windowIdRef = useRef<number | undefined>(undefined)
    const [tabState, setTabState] = useState<TabState>({status: "loading", tabId: undefined, url: undefined, windowId: undefined})

    useEffect(() => {
        chrome.windows.getCurrent().then(window => windowIdRef.current = window.id)
    }, [])

    useEffect(() => {
        const activatedEventHandler = (activeInfo: chrome.tabs.OnActivatedInfo) => {
            if(activeInfo.windowId === windowIdRef.current) {
                chrome.tabs.get(activeInfo.tabId).then((tab) => {
                    console.log("activated", activeInfo.tabId, tab.status, tab.url)
                    setTabState({status: tab.status ?? "unloaded", tabId: tab.id, url: tab.url, windowId: windowIdRef.current})
                })
            }
        }

        const updatedEventHandler = (tabId: number, changeInfo: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab) => {
            if((changeInfo.url || changeInfo.status) && tab.windowId === windowIdRef.current) {
                console.log("updated", tabId, tab.status, tab.url)
                setTabState({status: tab.status ?? "unloaded", tabId: tab.id, url: tab.url, windowId: windowIdRef.current})
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