import { onMounted, onUnmounted } from "vue"
import { AllEvents, WsEventConditions, WsEventResult } from "@/functions/ws-client"
import { useFetchManager } from "./install"

export interface FetchEventOptions {
    filter: WsEventConditions
    operation(context: OperationContext): void
}

interface OperationContext {
    /**
     * 事件。
     */
    event: AllEvents
    /**
     * 发生时间。
     */
    timestamp: number
}

export function useFetchEvent(options: FetchEventOptions) {
    const { wsClient } = useFetchManager()

    const emitter = wsClient.on(options.filter)

    onMounted(() => emitter.addEventListener(receiveEvent))
    onUnmounted(() => emitter.removeEventListener(receiveEvent))

    const receiveEvent = (e: WsEventResult) => {
        options.operation({event: e.event, timestamp: e.timestamp})
    }
}
