import { WsToastResult } from "@/functions/ipc-client/constants-model"
import { remoteIpcClient } from "@/functions/ipc-client"
import { Emitter } from "@/utils/emitter"
import { AllEvents, AllEventTypes } from "./constants"
export { wsEventFilters } from "./filters"

export type { AllEvents, AllEventTypes }

export interface WsClient {
    on(conditions?: WsEventConditions): Emitter<WsEventResult>
}

export interface WsEventResult {
    event: AllEvents
    timestamp: number
}

interface WsClientActivityEmitter {
    condition(e: AllEvents): boolean
    emit(e: WsEventResult): void
}

type WsEventFilter = (e: AllEvents) => boolean

export type WsEventConditions = WsEventFilter | AllEventTypes | (AllEventTypes | WsEventFilter)[]

export function createWsClient(): WsClient {
    const activityEmitters: Set<WsClientActivityEmitter> = new Set<WsClientActivityEmitter>()

    function addActivityEmitter(e: WsClientActivityEmitter) {
        if(activityEmitters.size === 0) {
            remoteIpcClient.app.wsToastEvent.addEventListener(wsToastEvent)
        }
        activityEmitters.add(e)
    }

    function removeActivityEmitter(e: WsClientActivityEmitter) {
        activityEmitters.delete(e)
        if(activityEmitters.size === 0) {
            remoteIpcClient.app.wsToastEvent.removeEventListener(wsToastEvent)
        }
    }

    function wsToastEvent(e: WsToastResult) {
        if(e.type === "EVENT") {
            const event = {event: <AllEvents>e.data.event, timestamp: e.data.timestamp}
            for (const activityEmitter of activityEmitters) {
                if(activityEmitter.condition(event.event)) {
                    activityEmitter.emit(event)
                }
            }
        }else if(e.type === "ERROR") {
            console.error(`[WsClient]ERROR  ${e.data.code}: ${e.data.message}`)
        }
    }

    return {
        on(conditions?: WsEventConditions): Emitter<WsEventResult> {
            let events: ((arg: WsEventResult) => void)[] = []

            const emitter: WsClientActivityEmitter = {
                condition: createCondition(conditions),
                emit(e: WsEventResult) {
                    for (const event of events) {
                        event(e)
                    }
                }
            }

            return {
                addEventListener(event) {
                    if(events.length === 0) {
                        addActivityEmitter(emitter)
                    }
                    events.push(event)
                },
                removeEventListener(event) {
                    events = events.filter(e => e !== event)
                    if(events.length === 0) {
                        removeActivityEmitter(emitter)
                    }
                },
                removeAllEventListeners() {
                    if(events.length > 0) {
                        removeActivityEmitter(emitter)
                    }
                    events = []
                }
            }
        }
    }
}

function createCondition(conditions?: WsEventConditions): (e: AllEvents) => boolean {
    if(conditions === undefined) {
        return () => true
    }else if(typeof conditions === "function") {
        return conditions
    }else if(typeof conditions === "string") {
        return (e: AllEvents) => e.eventType === conditions
    }else{
        const types = conditions.filter(s => typeof s === "string") as AllEventTypes[]
        const subConditions = conditions.filter(s => typeof s === "function") as WsEventFilter[]
        return (e: AllEvents) => types.some(t => t === e.eventType) || subConditions.some(t => t(e))
    }
}
