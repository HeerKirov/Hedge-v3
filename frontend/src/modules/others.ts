import { remoteIpcClient } from "@/functions/ipc-client"


/**
 * 打开一个HTTP(s)连接。出于安全考虑，只允许http/https连接。
 * @param url
 */
export function openExternalLink(url: string) {
    remoteIpcClient.remote.shell.openExternal(analyseSafeURL(url))
}

function analyseSafeURL(url: string): string {
    if(url.startsWith("http://") || url.startsWith("https://")) {
        return url
    }else{
        return `https://${url}`
    }
}

/**
 * 将文本内容写入剪贴板。
 * @param text
 */
export function writeClipboard(text: string) {
    window.navigator.clipboard.writeText(text).catch(console.error)
}

/**
 * 发送一条系统级通知消息。
 */
export function sendNotification(title: string, content: string | null | undefined) {
    new Notification(title, {body: content ?? undefined})
}
