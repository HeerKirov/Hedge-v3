
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
