import { ContentScriptMessagesList, ServiceSenderCallbackTypes, ServiceSenderMessages } from "@/functions/messages"
import { setActiveTabBadge } from "./active-tab"
import { downloadURL } from "@/services/downloads"
import { getSourceData } from "@/services/source-data"
import { server } from "@/functions/server";
import { settings } from "@/functions/setting.ts";

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
    if(msg.type === "SET_ACTIVE_TAB_BADGE") {
        if(sender.tab?.id) {
            setActiveTabBadge(sender.tab.id, msg.msg.path).finally()
        }
    }else if(msg.type === "DOWNLOAD_URL") {
        downloadURL({url: msg.msg.url, referrer: msg.msg.referrer}).finally()
    }else if(msg.type === "CAPTURE_VISIBLE_TAB") {
        chrome.tabs.captureVisibleTab().then(dataURL => callback(dataURL))
        return true
    }else if(msg.type === "GET_SOURCE_DATA") {
        getSourceData(msg.msg.siteName, msg.msg.sourceId).then(r => callback(r))
        return true
    }else if(msg.type === "SOURCE_TAG_MAPPING_GET") {
        server.sourceTagMapping.get(msg.msg).then(r => callback(r))
        return true
    }else if(msg.type === "QUICK_FIND_UPLOAD") {
        function dataURLtoFile(dataURL: string, fileName: string): File {
            const arr = dataURL.split(','), mime = arr[0].match(/:(.*?);/)![1], bstr = atob(arr[1])
            let n = bstr.length, u8arr = new Uint8Array(n)
            while(n--){
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new File([u8arr], fileName, {type:mime})
        }
        server.quickFind.upload({...msg.msg, file: dataURLtoFile(msg.msg.file as any, "tmp.jpg")}).then(r => callback(r))
        return true
    }else if(msg.type === "QUICK_FIND_GET") {
        server.quickFind.get(msg.msg.id).then(r => callback(r))
        return true
    }else if(msg.type === "ARCHIVE_GET") {
        settings.get().then(setting => {
            const url = new URL(`archives/${msg.msg.filepath}`, `http://${setting.server.host}`)

            return fetch(url, {
                headers: {
                    "Authorization": `Bearer ${setting.server.token}`,
                }
            })
        }).then(res => {
            if(res.ok) {
                return res.blob()
            }else{
                callback({
                    ok: false,
                    exception: undefined,
                    reason: res.statusText
                })
            }
        }).then(blob => {
            if(blob) {
                const reader = new FileReader()
                reader.onloadend = () => callback({ok: true, status: 200, data: reader.result})
                reader.readAsDataURL(blob)
            }
        }).catch((reason) => callback({
            ok: false,
            exception: undefined,
            reason
        }))
        return true
    }
    return false
}
