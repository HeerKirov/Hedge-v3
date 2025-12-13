import { useCallback, useEffect, useState } from "react"

export type DownloadItem = {
    id: number
    filename: string
    url: string
    referrer: string
    mime: string
    totalBytes: number | undefined
    startTime: Date
} & ({
    state: "danger"
    dangerType: `${chrome.downloads.DangerType}`
} | {
    state: "in_progress"
    paused: boolean
    bytesReceived: number
    estimatedEndTime: Date | undefined
} | {
    state: "interrupted"
    error: `${chrome.downloads.InterruptReason}`
    canResume: boolean
} | {
    state: "cancelled"
    error: `${chrome.downloads.InterruptReason.USER_CANCELED}` | `${chrome.downloads.InterruptReason.USER_SHUTDOWN}`
} | {
    state: "complete"
    exists: boolean
    endTime: Date
})

export function useDownloadList() {
    const [downloadList, setDownloadList] = useState<chrome.downloads.DownloadItem[]>([])

    const count = getCount(downloadList)
    
    const downloadListExternal = downloadList.map(toDownloadItem)
    
    const needUpdate = downloadListExternal.some(item => item.state === "in_progress" && !item.paused)

    const clear = useCallback(() => {
        chrome.downloads.erase({state: "interrupted", error: "USER_CANCELED"})
        chrome.downloads.erase({state: "interrupted", error: "USER_SHUTDOWN"})
        chrome.downloads.search({state: "complete", exists: true}).then(() => {
            chrome.downloads.erase({state: "complete", exists: false})
        })
    }, [])

    useEffect(() => {
        if(needUpdate) {
            const interval = setInterval(() => {
                chrome.downloads.search({state: "in_progress", paused: false}).then(result => {
                    setDownloadList(v => v.map(item => {
                        const index = result.findIndex(i => i.id === item.id)
                        if(index >= 0) {
                            return {...item, ...result[index]}
                        }else{
                            return item
                        }
                    }))
                })
            }, 500)
            return () => clearInterval(interval)
        }
    }, [needUpdate])

    useEffect(() => {
        chrome.downloads.search({orderBy: ["-startTime"]}).then(result => {
            setDownloadList(result)
        })

        const createdEventHandler = (downloadItem: chrome.downloads.DownloadItem) => {
            setDownloadList(v => [downloadItem, ...v])
        }
        const changedEventHandler = (downloadDelta: chrome.downloads.DownloadDelta) => {
            console.log('onChanged 事件:', downloadDelta)
            setDownloadList(v => {
                const index = v.findIndex(i => i.id === downloadDelta.id)
                if(index >= 0) {
                    const newItem = {...v[index]}
                    for(const [key, value] of Object.entries(downloadDelta)) {
                        if(key !== "id" && value) {
                            (newItem as any)[key] = value.current
                        }
                    }
                    console.log('更新后的下载项:', newItem)
                    return [...v.slice(0, index), newItem, ...v.slice(index + 1)]   
                }
                return v
            })
        }
        const erasedEventHandler = (downloadId: number) => {
            console.log('onErased 事件，下载项 ID:', downloadId)
            setDownloadList(v => v.filter(i => i.id !== downloadId))
        }

        chrome.downloads.onCreated.addListener(createdEventHandler)
        chrome.downloads.onChanged.addListener(changedEventHandler)
        chrome.downloads.onErased.addListener(erasedEventHandler)
        return () => {
            chrome.downloads.onCreated.removeListener(createdEventHandler)
            chrome.downloads.onChanged.removeListener(changedEventHandler)
            chrome.downloads.onErased.removeListener(erasedEventHandler)    
        }
    }, [])

    return {downloadList: downloadListExternal, count, clear}
}

function toDownloadItem(item: chrome.downloads.DownloadItem): DownloadItem {
    const filename = item.filename.substring(item.filename.lastIndexOf("/") + 1)
    const totalBytes = item.totalBytes > 0 ? item.totalBytes : undefined
    if(item.state === "in_progress") {
        if(item.danger && !DANGER_SAFE_TYPES.includes(item.danger)) {
            return {
                id: item.id,
                filename,
                url: item.url,
                referrer: item.referrer,
                mime: item.mime,
                totalBytes,
                state: "danger",
                dangerType: item.danger,
                startTime: new Date(item.startTime)
            }
        }else{
            return {
                id: item.id,
                filename,
                url: item.url,
                referrer: item.referrer,
                mime: item.mime,
                totalBytes,
                state: "in_progress",
                paused: item.paused,
                bytesReceived: item.bytesReceived,
                startTime: new Date(item.startTime),
                estimatedEndTime: item.estimatedEndTime ? new Date(item.estimatedEndTime!) : undefined
            }
        }
    }else if(item.state === "interrupted") {
        if(item.error === "USER_CANCELED" || item.error === "USER_SHUTDOWN") {
            return {
                id: item.id,
                filename,
                url: item.url,
                referrer: item.referrer,
                mime: item.mime,
                totalBytes,
                state: "cancelled",
                error: item.error!,
                startTime: new Date(item.startTime)
            }
        }else{
            return {
                id: item.id,
                filename,
                url: item.url,
                referrer: item.referrer,
                mime: item.mime,
                totalBytes,
                state: "interrupted",
                error: item.error!,
                canResume: item.canResume,
                startTime: new Date(item.startTime)
            }
        }
    }else{
        return {
            id: item.id,
            filename,
            url: item.url,
            referrer: item.referrer,
            mime: item.mime,
            totalBytes,
            state: "complete",
            exists: item.exists,
            startTime: new Date(item.startTime),
            endTime: new Date(item.endTime!)
        }
    }
}

function getCount(downloadList: chrome.downloads.DownloadItem[]) {
    const count = {
        inProgressCount: 0,
        interruptedCount: 0,
        cancelledCount: 0,
        completeCount: 0,
        deletedCount: 0
    }

    for(const item of downloadList) {
        if(item.state === "in_progress") {
            count.inProgressCount++
        }else if(item.state === "interrupted") {
            if(item.error === "USER_CANCELED" || item.error === "USER_SHUTDOWN") {
                count.cancelledCount++
            }else{
                count.interruptedCount++
            }
        }else if(item.state === "complete") {
            if(item.exists) {
                count.completeCount++
            }else{
                count.deletedCount++
            }
        }
    }

    return count
}

export const DANGER_SAFE_TYPES = [
    `${chrome.downloads.DangerType.SAFE}`,
    `${chrome.downloads.DangerType.DEEP_SCANNED_SAFE}`,
    `${chrome.downloads.DangerType.UNCOMMON}`,
    `${chrome.downloads.DangerType.ACCEPTED}`,
    `${chrome.downloads.DangerType.ALLOWLISTED_BY_POLICY}`,
]