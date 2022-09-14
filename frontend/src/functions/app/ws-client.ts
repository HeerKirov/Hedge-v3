import { onMounted, onUnmounted } from "vue"
import { installation } from "@/utils/reactivity"
import { createWsClient, WsEventResult, WsEventConditions } from "@/functions/ws-client"
import { RefEmitter, useRefEmitter } from "@/utils/emitter"

export const [installWsClient, useWsClient] = installation(createWsClient)

export function useWsListeningEvent(conditions?: WsEventConditions): RefEmitter<WsEventResult> {
    const wsClient = useWsClient()
    const emitter = wsClient.on(conditions)

    const refEmitter = useRefEmitter<WsEventResult>()

    onMounted(() => emitter.addEventListener(refEmitter.emit))

    onUnmounted(() => emitter.removeEventListener(refEmitter.emit))

    return refEmitter
}
