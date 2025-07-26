import { onMounted, onUnmounted } from "vue"
import { remoteIpcClient } from "@/functions/ipc-client"
import { TabControlEvent } from "@/functions/ipc-client/constants-model"

interface ApplicationMenuTabsOptions {
    newTab?(route?: {routeName: string, path?: unknown, params?: Record<string, any>, initializer?: Record<string, any>}): void
    closeTab?(): void
    resumeTab?(): void
    duplicateTab?(): void
    nextTab?(): void
    prevTab?(): void
    routeBack?(): void
    routeForward?(): void
}


export function useApplicationMenuTabs(options: ApplicationMenuTabsOptions) {
    const receiveEvent = (e: TabControlEvent) => {
        if(e.type === "NEW_TAB") {
            const newRoute = e.routeName !== undefined ? {
                routeName: e.routeName,
                path: e.path !== undefined ? JSON.parse(window.atob(e.path)) : undefined,
                params: e.params ? JSON.parse(window.atob(e.params)) : undefined,
                initializer: e.initializer ? JSON.parse(window.atob(e.initializer)) : undefined
            } : undefined
            options.newTab?.(newRoute)
        }
        else if(e.type === "CLOSE_TAB") options.closeTab?.()
        else if(e.type === "RESUME_TAB") options.resumeTab?.()
        else if(e.type === "CLONE_TAB") options.duplicateTab?.()
        else if(e.type === "PREV_TAB") options.prevTab?.()
        else if(e.type === "NEXT_TAB") options.nextTab?.()
        else if(e.type === "ROUTE_BACK") options.routeBack?.()
        else if(e.type === "ROUTE_FORWARD") options.routeForward?.()
    }

    onMounted(() => {
        remoteIpcClient.remote.tabs.updateState({enabled: true})
        remoteIpcClient.remote.tabs.controlEvent.addEventListener(receiveEvent)
    })

    onUnmounted(() => {
        remoteIpcClient.remote.tabs.updateState({enabled: false})
        remoteIpcClient.remote.tabs.controlEvent.removeEventListener(receiveEvent)
    })
}
