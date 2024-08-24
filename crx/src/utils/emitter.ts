
export interface EventTrigger<T> {
    addEventListener(callback: (e: T) => void): void
    removeEventListener(callback: (e: T) => void): void
    emit(e: T): void
}

export function createEventTrigger<T>(): EventTrigger<T> {
    const callbacks: ((e: T) => void)[] = []
    const cache: T[] = []

    return {
        addEventListener(callback) {
            callbacks.push(callback)
            if(cache.length > 0) cache.splice(0, cache.length).forEach(callback)
        },
        removeEventListener(callback) {
            const idx = callbacks.indexOf(callback)
            callbacks.splice(idx, 1)
        },
        emit(e) {
            if(callbacks.length > 0) callbacks.forEach(c => c(e))
            else cache.push(e)
        }
    }
}