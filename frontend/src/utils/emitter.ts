import { Ref, ref, watch } from "vue"

/**
 * 简化版的、只有单一事件的event emitter。
 */
export interface Emitter<T> {
    addEventListener(event: EmitterEvent<T>): void
    removeEventListener(event: EmitterEvent<T>): void
    removeAllEventListeners(): void
}

interface SendEmitter<T> extends Emitter<T> {
    emit(arg: T): void
}

type EmitterEvent<T> = (arg: T) => void

export function createEmitter<T>(): SendEmitter<T> {
    let events: EmitterEvent<T>[] = []

    return {
        addEventListener(event: EmitterEvent<T>) {
            events.push(event)
        },
        removeEventListener(event: EmitterEvent<T>) {
            events = events.filter(e => e !== event)
        },
        removeAllEventListeners() {
            events = []
        },
        emit(arg: T) {
            for (let event of events) {
                event(arg)
            }
        }
    }
}

/**
 * 使用vue响应系统构建的、自动建立依赖与自动解除依赖的event emitter。
 */
export interface RefEmitter<T> {
    emitter: Readonly<Ref<T | undefined>>
}

export interface SendRefEmitter<T> extends RefEmitter<T> {
    emit(arg: T): void
}

export function useRefEmitter<T>(): SendRefEmitter<T> {
    const emitter: Ref<T | undefined> = ref()

    const emit = (arg: T) => {
        emitter.value = arg
        emitter.value = undefined
    }

    return {emitter, emit}
}

export function useListeningEvent<T>(emitter: RefEmitter<T>, event: (arg: T) => void) {
    watch(emitter.emitter, v => {
        if(v !== undefined) {
            event(v)
        }
    }, {flush: "sync"})
}

