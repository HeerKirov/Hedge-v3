import { sendMessageToTab } from "@/services/messages"

export const globalContextMenu: chrome.contextMenus.CreateProperties[] = [
    {
        title: "下载全部图片",
        contexts:["page"],
        id: "fanbox-download-all-images",
        targetUrlPatterns: ["https://www.fanbox.cc/*/posts/*", "https://*.fanbox.cc/posts/*"],
    }
]

export function contextMenuClicked(e: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab | undefined) {
    if(e.menuItemId === "fanbox-download-all-images") {
        sendMessageToTab(tab!.id!, "DOWNLOAD_ALL", undefined)
    }
}