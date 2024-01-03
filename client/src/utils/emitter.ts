
export interface Emitter<T> {
    addEventListener(event: EmitterEvent<T>): void
    removeEventListener(event: EmitterEvent<T>): void
    removeAllEventListeners(): void
}

type EmitterEvent<T> = (arg: T) => void

export interface SendEmitter<T> extends Emitter<T> {
    emit(arg: T): void
}

/**
 * 创建一个标准emitter，它由创建者手动调用emit来发送事件。
 */
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

interface ProxyEmitterOptions<T> {
    mount(emit: (arg: T) => void): void
    unmount?(emit: (arg: T) => void): void
}

/**
 * 创建一个代理型emitter，在它拥有监听者时，它自动向代理方调用挂载它的监听事件；在监听者清空时，它也自动卸载它的监听事件。
 */
export function createProxyEmitter<T>(options: ProxyEmitterOptions<T> | ProxyEmitterOptions<T>["mount"]): Emitter<T> {
    let events: EmitterEvent<T>[] = []

    function emit(arg: T) {
        for (let event of events) {
            event(arg)
        }
    }

    const mount = options instanceof Function ? options : options.mount
    const unmount = options instanceof Function ? undefined : options.unmount

    let mounted = false

    return {
        addEventListener(event: EmitterEvent<T>) {
            if(!mounted && events.length === 0) {
                mount(emit)
                mounted = true
            }
            events.push(event)
        },
        removeEventListener(event: EmitterEvent<T>) {
            events = events.filter(e => e !== event)
            if(mounted && unmount && events.length === 0) {
                unmount(emit)
                mounted = false
            }
        },
        removeAllEventListeners() {
            events = []
            if(mounted && unmount) {
                unmount(emit)
                mounted = false
            }
        }
    }
}
