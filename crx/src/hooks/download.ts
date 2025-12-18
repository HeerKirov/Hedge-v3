import { Setting } from "@/functions/setting"
import { IconProp } from "@fortawesome/fontawesome-svg-core"
import { useCallback, useEffect, useRef, useState } from "react"

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

export function useDownloadList(options: Setting["extension"]["downloadManager"]) {
    const [downloadList, setDownloadList] = useState<chrome.downloads.DownloadItem[]>([])

    const count = getCount(downloadList)
    
    const downloadListExternal = downloadList.map(toDownloadItem)
    
    const needUpdate = count.inProgressCount > 0 && downloadListExternal.some(item => item.state === "in_progress" && !item.paused)

    const needAutoClear = options.autoClear && (
        ((options.autoClearAction === "CANCELLED_AND_DELETED" || options.autoClearAction === "CANCELLED_AND_COMPLETE") && (count.cancelledCount > 0 || count.completeCount > 0 || count.deletedCount > 0)) ||
        (options.autoClearAction === "ALL_NOT_PROGRESSING" && (count.cancelledCount > 0 || count.completeCount > 0 || count.deletedCount > 0 || count.interruptedCount > 0))
    )

    const clear = useCallback(() => clearDownloads(options.clearButtonAction), [options.clearButtonAction])

    useEffect(() => {
        if(needAutoClear) {
            const interval = setInterval(() => {
                console.log(`[DownloadManager] Auto clear downloads. Action: ${options.autoClearAction}`)
                clearDownloads(options.autoClearAction)
            }, options.autoClearIntervalSec * 1000)
            return () => clearInterval(interval)
        }
    }, [needAutoClear, options.autoClearAction, options.autoClearIntervalSec])

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
            setDownloadList(v => {
                const index = v.findIndex(i => i.id === downloadDelta.id)
                if(index >= 0) {
                    const newItem = {...v[index]}
                    for(const [key, value] of Object.entries(downloadDelta)) {
                        if(key !== "id" && value) {
                            (newItem as any)[key] = value.current
                        }
                    }
                    return [...v.slice(0, index), newItem, ...v.slice(index + 1)]   
                }
                return v
            })
        }
        const erasedEventHandler = (downloadId: number) => {
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

function clearDownloads(action: Setting["extension"]["downloadManager"]["clearButtonAction"]) {
    if(action === "CANCELLED_AND_DELETED") {
        chrome.downloads.erase({state: "interrupted", error: "USER_CANCELED"})
        chrome.downloads.erase({state: "interrupted", error: "USER_SHUTDOWN"})
        chrome.downloads.search({state: "complete", exists: true}).then(() => {
            chrome.downloads.erase({state: "complete", exists: false})
        })
    }else if(action === "CANCELLED_AND_COMPLETE") {
        chrome.downloads.erase({state: "interrupted", error: "USER_CANCELED"})
        chrome.downloads.erase({state: "interrupted", error: "USER_SHUTDOWN"})
        chrome.downloads.erase({state: "complete"})
    }else{
        chrome.downloads.erase({state: "interrupted"})
        chrome.downloads.erase({state: "complete"})
    }
    
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

/**
 * 获取下载项图标的 hook，支持重试和文件名变化监听
 */
export function useDownloadItemIcon(item: DownloadItem): string | undefined {
    const [icon, setIcon] = useState<string | undefined>(undefined)
    const retryCountRef = useRef(0)
    const lastFilenameRef = useRef<string | null>(null)
    const timeoutRef = useRef<number | undefined>(undefined)

    const fetchIcon = useCallback(async (retryDelay: number = 0) => {
        console.log("fetchIcon", item.filename)
        // 如果文件名还未确定（可能是 determiningFilename 状态），延迟重试
        // 文件名未确定时通常为空字符串或只包含路径分隔符
        const filenameDetermined = item.filename && item.filename.trim() !== '' && !item.filename.endsWith('/')
        
        if (!filenameDetermined) {
            if (retryCountRef.current < 5) {
                retryCountRef.current++
                timeoutRef.current = window.setTimeout(() => {
                    fetchIcon(500)
                }, retryDelay || 500)
            }
            return
        }

        try {
            const fileIcon = await chrome.downloads.getFileIcon(item.id)
            if (fileIcon) {
                setIcon(fileIcon)
                retryCountRef.current = 0
                lastFilenameRef.current = item.filename
            } else if (retryCountRef.current < 3) {
                // 如果返回 null，也进行重试
                retryCountRef.current++
                timeoutRef.current = window.setTimeout(() => {
                    fetchIcon(1000)
                }, retryDelay || 1000)
            }
        } catch (error) {
            // 如果获取失败且重试次数未达上限，延迟重试
            if (retryCountRef.current < 3) {
                retryCountRef.current++
                timeoutRef.current = window.setTimeout(() => {
                    fetchIcon(1000)
                }, retryDelay || 1000)
            }
        }
    }, [item.id, item.filename])

    useEffect(() => {
        // 当文件名变化时，重置重试计数并重新获取
        if (lastFilenameRef.current !== item.filename) {
            retryCountRef.current = 0
            setIcon(undefined) // 重置图标状态，显示后备图标
            fetchIcon(0)
        }

        return () => {
            if (timeoutRef.current !== undefined) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [item.filename, fetchIcon])

    return icon
}

export const DANGER_SAFE_TYPES = [
    `${chrome.downloads.DangerType.SAFE}`,
    `${chrome.downloads.DangerType.DEEP_SCANNED_SAFE}`,
    `${chrome.downloads.DangerType.UNCOMMON}`,
    `${chrome.downloads.DangerType.ACCEPTED}`,
    `${chrome.downloads.DangerType.ALLOWLISTED_BY_POLICY}`,
]