import { sessions } from "@/functions/storage"

export function notificationButtonClicked(notificationId: string, buttonIndex: number) {
    if(notificationId === "AUTO_COLLECT_SERVER_DISCONNECTED") {
        if(buttonIndex === 0) {
            sessions.cache.closeAutoCollect(true).finally()
        }
    }
}

export function notify(context: {notificationId?: string, title: string, message: string, buttons?: [{title: string}]}) {
    const options: chrome.notifications.NotificationCreateOptions = {
        type: "basic",
        iconUrl: "/public/favicon.png",
        title: context.title,
        message: context.message,
        buttons: context.buttons
    }
    if(context.notificationId !== undefined) {
        chrome.notifications.create(context.notificationId, options)
    }else{
        chrome.notifications.create(options)
    }
}

export const NOTIFICATIONS = {
    AUTO_COLLECT_SERVER_DISCONNECTED: "AUTO_COLLECT_SERVER_DISCONNECTED"
}
