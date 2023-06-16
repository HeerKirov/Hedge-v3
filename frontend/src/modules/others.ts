import { remoteIpcClient } from "@/functions/ipc-client"


/**
 * 打开一个HTTP(s)连接。出于安全考虑，只允许http/https连接。
 * @param url
 */
export function openExternalLink(url: string) {
    remoteIpcClient.remote.shell.openExternal(analyseSafeURL(url))
}

/**
 * 使用系统默认的方式打开一个本地文件。
 * @param url
 */
export function openLocalFile(url: string) {
    remoteIpcClient.remote.shell.openPath(url)
}

/**
 * 在文件夹中显示一个本地文件。
 * @param url
 */
export function openLocalFileInFolder(url: string) {
    remoteIpcClient.remote.shell.openPathInFolder(url)
}

function analyseSafeURL(url: string): string {
    if(url.startsWith("http://") || url.startsWith("https://")) {
        return url
    }else{
        return `https://${url}`
    }
}

/**
 * 启用系统级的文件拖曳，允许将目标文件拖曳到外部。
 */
export function startDragFile(thumbnail: string, filepath: string | string[]) {
    remoteIpcClient.remote.shell.startDragFile(thumbnail, filepath)
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
