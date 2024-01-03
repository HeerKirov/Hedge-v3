import { onMounted, onUnmounted } from "vue"
import { remoteIpcClient } from "@/functions/ipc-client"
import { TabControlEvent } from "@/functions/ipc-client/constants-model"

interface ApplicationMenuTabsOptions {
    newTab?(): void
    closeTab?(): void
    duplicateTab?(): void
    nextTab?(): void
    prevTab?(): void
    routeBack?(): void
    routeForward?(): void
}


export function useApplicationMenuTabs(options: ApplicationMenuTabsOptions) {
    const receiveEvent = (e: TabControlEvent) => {
        if(e === "NEW_TAB") options.newTab?.()
        else if(e === "CLOSE_TAB") options.closeTab?.()
        else if(e === "CLONE_TAB") options.duplicateTab?.()
        else if(e === "PREV_TAB") options.prevTab?.()
        else if(e === "NEXT_TAB") options.nextTab?.()
        else if(e === "ROUTE_BACK") options.routeBack?.()
        else if(e === "ROUTE_FORWARD") options.routeForward?.()
    }

    onMounted(() => remoteIpcClient.remote.tabs.controlEvent.addEventListener(receiveEvent))

    onUnmounted(() => remoteIpcClient.remote.tabs.controlEvent.removeEventListener(receiveEvent))
}
