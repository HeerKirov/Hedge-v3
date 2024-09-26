import { ContentScriptMessagesList, ServiceSenderCallbackTypes, ServiceSenderMessages } from "@/functions/messages"
import { fetchRequestByMessage } from "@/functions/server"
import { downloadURL } from "@/services/downloads"
import { sourceDataManager } from "@/services/source-data"
import { setActiveTabBadge } from "@/services/active-tab"
import { notification } from "@/services/notification"

/**
 * service worker: 接收一条消息。
 */
export function receiveMessage(msg: any, sender: chrome.runtime.MessageSender, callback: (response?: any) => void): boolean | void {
    const message = {type: msg.type, msg: msg.msg, callback} as unknown as ContentScriptMessagesList
    return onMessage(message, sender, callback)
}

/**
 * 发送一条消息到指定的tab。
 */
export function sendMessageToTab<T extends keyof ServiceSenderMessages>(tabId: number, type: T, msg: ServiceSenderMessages[T]["msg"]): T extends ServiceSenderCallbackTypes ? Promise<Parameters<ServiceSenderMessages[T]["callback"]>[0]> : void {
    return chrome.tabs.sendMessage(tabId, {type, msg}) as any
}

function onMessage<T extends ContentScriptMessagesList>(msg: T, sender: chrome.runtime.MessageSender, callback: (response?: any) => void): boolean {
    if(msg.type === "SUBMIT_PAGE_INFO") {
        if(sender.tab?.id) setActiveTabBadge(sender.tab.id, msg.msg.path).finally()
    }else if(msg.type === "SUBMIT_SOURCE_DATA") {
        sourceDataManager.submit(msg.msg.path, msg.msg.data)
    }else if(msg.type === "GET_SOURCE_DATA") {
        sourceDataManager.get(msg.msg).then(r => callback(r))
        return true
    }else if(msg.type === "COLLECT_SOURCE_DATA") {
        sourceDataManager.collect({...msg.msg, type: "manual"}).then(r => callback(r))
        return true
    }else if(msg.type === "DOWNLOAD_URL") {
        downloadURL(msg.msg).finally()
    }else if(msg.type === "NOTIFICATION") {
        notification(msg.msg)
    }else if(msg.type === "CAPTURE_VISIBLE_TAB") {
        chrome.tabs.captureVisibleTab().then(dataURL => callback(dataURL))
        return true
    }else if(msg.type === "FETCH_REQUEST") {
        fetchRequestByMessage(msg.msg).then(r => callback(r))
        return true
    }
    return false
}
