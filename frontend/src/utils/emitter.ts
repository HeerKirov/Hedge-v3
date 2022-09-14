import { onMounted, onUnmounted, Ref, ref, watch } from "vue"

/**
 * 简化版的、只有单一事件的event emitter。
 */
export interface Emitter<T> {
    addEventListener(event: EmitterEvent<T>, weakRef?: boolean): void
    removeEventListener(event: EmitterEvent<T>, weakRef?: boolean): void
    removeAllEventListeners(): void
}

interface SendEmitter<T> extends Emitter<T> {
    emit(arg: T): void
}

type EmitterEvent<T> = (arg: T) => void

export function createEmitter<T>(): SendEmitter<T> {
    let events: Set<(EmitterEvent<T> | WeakRef<EmitterEvent<T>>)> = new Set<EmitterEvent<T> | WeakRef<EmitterEvent<T>>>()

    return {
        addEventListener(event: EmitterEvent<T>, weakRef?: boolean) {
            if(weakRef) {
                events.add(new WeakRef(event))
            }else{
                events.add(event)
            }
        },
        removeEventListener(event: EmitterEvent<T>, weakRef?: boolean) {
            if(weakRef) {
                for(const everyEvent of events) {
                    if(everyEvent instanceof WeakRef) {
                        const ref = everyEvent.deref()
                        if(ref === event) {
                            events.delete(everyEvent)
                            break
                        }else if(ref === undefined) {
                            events.delete(everyEvent)
                        }
                    }
                }
            }else{
                events.delete(event)
            }
        },
        removeAllEventListeners() {
            events = new Set<EmitterEvent<T>>()
        },
        emit(arg: T) {
            for(const event of events) {
                if(event instanceof WeakRef) {
                    const ref = event.deref()
                    if(ref !== undefined) ref(arg)
                    else events.delete(event)
                }else{
                    event(arg)
                }
            }
        }
    }
}

interface ProxyEmitterOptions<T, R> {
    mount(emit: (arg: T) => void): void
    unmount(emit: (arg: T) => void): void
    map(from: T): R
    filter?(from: T): boolean
}

/**
 * 创建一个代理型emitter，在它拥有监听者时，它自动向代理方调用挂载它的监听事件；在监听者清空时，它也自动卸载它的监听事件。
 * 同时，它会映射改变传递的事件，或者对事件进行过滤。
 */
export function createMapProxyEmitter<T, R>(options: ProxyEmitterOptions<T, R>): Emitter<R> {
    let events: EmitterEvent<R>[] = []

    function emit(arg: T) {
        if(options.filter?.(arg) ?? true) {
            for(const event of events) {
                event(options.map(arg))
            }
        }
    }

    let mounted = false

    return {
        addEventListener(event: EmitterEvent<R>) {
            if(!mounted && events.length === 0) {
                options.mount(emit)
                mounted = true
            }
            events.push(event)
        },
        removeEventListener(event: EmitterEvent<R>) {
            events = events.filter(e => e !== event)
            if(mounted && events.length === 0) {
                options.unmount(emit)
                mounted = false
            }
        },
        removeAllEventListeners() {
            events = []
            if(mounted) {
                options.unmount(emit)
                mounted = false
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

export function useRefByEmitter<T extends object>(emitter: Emitter<T>): SendRefEmitter<T> {
    const refEmitter = useRefEmitter<T>()

    onMounted(() => emitter.addEventListener(refEmitter.emit))
    onUnmounted(() => emitter.removeEventListener(refEmitter.emit))

    return refEmitter
}

export function useListeningEvent<T>(emitter: RefEmitter<T>, event: (arg: T) => void) {
    watch(emitter.emitter, v => {
        if(v !== undefined) {
            event(v)
        }
    }, {flush: "sync"})
}

