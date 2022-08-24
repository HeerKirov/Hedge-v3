import { onMounted, onUnmounted } from "vue"
import { installation } from "@/utils/reactivity"
import { createWsClient, WsEventFilter, WsEventResult } from "@/functions/ws-client"
import { AllEventTypes } from "@/functions/ws-client/constants"
import { RefEmitter, useRefEmitter } from "@/utils/emitter"

export const [installWsClient, useWsClient] = installation(createWsClient)

export function useWsListeningEvent(conditions?: AllEventTypes | WsEventFilter | (AllEventTypes | WsEventFilter)[]): RefEmitter<WsEventResult> {
    const wsClient = useWsClient()
    const emitter = wsClient.on(conditions)

    const refEmitter = useRefEmitter<WsEventResult>()

    onMounted(() => emitter.addEventListener(refEmitter.emit))

    onUnmounted(() => emitter.removeEventListener(refEmitter.emit))

    return refEmitter
}
