import { sessions } from "@/functions/storage"

export function notificationButtonClicked(notificationId: string, buttonIndex: number) {
    if(notificationId === "AUTO_COLLECT_SERVER_DISCONNECTED") {
        if(buttonIndex === 0) {
            sessions.cache.closeAutoCollect(true).finally()
        }
    }
}

export const NOTIFICATIONS = {
    AUTO_COLLECT_SERVER_DISCONNECTED: "AUTO_COLLECT_SERVER_DISCONNECTED"
}
