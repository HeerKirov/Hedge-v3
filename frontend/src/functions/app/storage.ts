import { ref, Ref, watch } from "vue"
import { remoteIpcClient } from "@/functions/ipc-client"
import { useCurrentTab } from "@/modules/browser"
import { installation } from "@/utils/reactivity"

export interface StorageAccessor<T> {
    get(): T
    set(value: T): void
}

export function createLocalStorage<T>(bucketName: string): StorageAccessor<T | null>
export function createLocalStorage<T>(bucketName: string, defaultValue: T): StorageAccessor<T>
export function createLocalStorage<T>(bucketName: string, defaultValue: () => T, defaultFunction: true): StorageAccessor<T>

/**
 * 创建一个local storage存储器。
 */
export function createLocalStorage<T>(bucketName: string, defaultValue?: T | (() => T), defaultFunction?: boolean): StorageAccessor<T | null> {
    const storageName = `com.heerkirov.hedge.v3(${remoteIpcClient.setting.channel.getCurrent()})${bucketName}`

    return {
        get(): T | null {
            const initValue = window.localStorage.getItem(storageName)
            if(initValue !== null) {
                return JSON.parse(initValue)
            }else if(defaultFunction && defaultValue instanceof Function) {
                return defaultValue()
            }else if(defaultValue !== undefined) {
                return defaultValue as T
            }else{
                return null
            }
        },
        set(value: T): void {
            if(value !== null) {
                window.localStorage.setItem(storageName, JSON.stringify(value))
            }else{
                window.localStorage.removeItem(storageName)
            }
        }
    }
}

export function useLocalStorage<T>(bucketName: string): Ref<T | null>
export function useLocalStorage<T>(bucketName: string, defaultValue: T): Ref<T>
export function useLocalStorage<T>(bucketName: string, defaultValue: () => T, defaultFunction: true): Ref<T>

/**
 * 引用一个local storage存储器。它是永久存储器。
 * 存储器的实现依赖于channel。不同的channel使用的bucket name有所不同，以此实现隔离。
 * @param bucketName 存储标识名。
 * @param defaultValue 如果存储未初始化，则使用此值初始化存储。初始化的存储不会立刻存入，只有修改会导致存入。
 * @param defaultFunction
 * @return 存储的响应式数据。null表示无值，其他表示有值
 */
export function useLocalStorage<T>(bucketName: string, defaultValue?: T | (() => T), defaultFunction?: boolean): Ref<T | null> {
    const accessor = createLocalStorage<T>(bucketName, defaultValue as any, defaultFunction as any)

    const data: Ref<T | null> = ref(accessor.get()) as Ref<T | null>

    watch(data, value => accessor.set(value as T), {deep: true})

    return data
}

/**
 * 单次取出一个local storage存储的值。
 */
export function getLocalStorage<T>(bucketName: string): T | null {
    return createLocalStorage<T>(bucketName).get()
}

export function createSessionStorage<T>(bucketName: string): StorageAccessor<T | null>
export function createSessionStorage<T>(bucketName: string, defaultValue: T): StorageAccessor<T>
export function createSessionStorage<T>(bucketName: string, defaultValue: () => T, defaultFunction: true): StorageAccessor<T>

/**
 * 创建一个session storage存储器。
 */
export function createSessionStorage<T>(bucketName: string, defaultValue?: T | (() => T), defaultFunction?: boolean): StorageAccessor<T | null> {
    return {
        get(): T | null {
            const initValue = window.sessionStorage.getItem(bucketName)
            if(initValue !== null) {
                return JSON.parse(initValue)
            }else if(defaultFunction && defaultValue instanceof Function) {
                return defaultValue()
            }else if(defaultValue !== undefined) {
                return defaultValue as T
            }else{
                return null
            }
        },
        set(value: T): void {
            if(value !== null) {
                window.sessionStorage.setItem(bucketName, JSON.stringify(value))
            }else{
                window.sessionStorage.removeItem(bucketName)
            }
        }
    }
}

export function useSessionStorage<T>(bucketName: string): Ref<T | null>
export function useSessionStorage<T>(bucketName: string, defaultValue: T): Ref<T>
export function useSessionStorage<T>(bucketName: string, defaultValue: () => T, defaultFunction: true): Ref<T>

/**
 * 引用一个session storage存储器。它的特点是只存活到窗口关闭为止。
 */
export function useSessionStorage<T>(bucketName: string, defaultValue?: T | (() => T), defaultFunction?: boolean): Ref<T | null> {
    const accessor = createSessionStorage<T>(bucketName, defaultValue as any, defaultFunction as any)

    const data: Ref<T | null> = ref(accessor.get()) as Ref<T | null>

    watch(data, value => accessor.set(value as T), {deep: true})

    return data
}

/**
 * 单次取出一个session storage存储的值。
 */
export function getSessionStorage<T>(bucketName: string): T | null {
    return createSessionStorage<T>(bucketName).get()
}

export function createMemoryStorage<T>(bucketName: string): StorageAccessor<T | null>
export function createMemoryStorage<T>(bucketName: string, defaultValue: T): StorageAccessor<T>
export function createMemoryStorage<T>(bucketName: string, defaultValue: () => T, defaultFunction: true): StorageAccessor<T>

/**
 * 创建一个memory storage存储器。
 */
export function createMemoryStorage<T>(bucketName: string, defaultValue?: T | (() => T), defaultFunction?: boolean): StorageAccessor<T | null> {
    const { memory } = useMemoryStorageManager()

    return {
        get(): T | null {
            const initValue = memory.get(bucketName)
            if(initValue !== undefined) {
                return initValue as T
            }else if(defaultFunction && defaultValue instanceof Function) {
                return defaultValue()
            }else if(defaultValue !== undefined) {
                return defaultValue as T
            }else{
                return null
            }
        },
        set(value: T): void {
            if(value !== null) {
                memory.set(bucketName, value)
            }else{
                memory.delete(bucketName)
            }
        }
    }
}

export function useMemoryStorage<T>(bucketName: string): Ref<T | null>
export function useMemoryStorage<T>(bucketName: string, defaultValue: T): Ref<T>
export function useMemoryStorage<T>(bucketName: string, defaultValue: () => T, defaultFunction: true): Ref<T>

/**
 * 引用一个memory storage存储器。它使用内存实现，刷新就会丢失数据。
 */
export function useMemoryStorage<T>(bucketName: string, defaultValue?: T | (() => T), defaultFunction?: boolean): Ref<T | null> {
    const accessor = createMemoryStorage<T>(bucketName, defaultValue as any, defaultFunction as any)

    const data: Ref<T | null> = ref(accessor.get()) as Ref<T | null>

    watch(data, value => accessor.set(value as T), {deep: true})

    return data
}

/**
 * 单次取出一个memory storage存储的值。
 */
export function getMemoryStorage<T>(bucketName: string): T | null {
    return createMemoryStorage<T>(bucketName).get()
}

export function createTabStorage<T>(bucketName: string): StorageAccessor<T | null>
export function createTabStorage<T>(bucketName: string, defaultValue: T): StorageAccessor<T>
export function createTabStorage<T>(bucketName: string, defaultValue: () => T, defaultFunction: true): StorageAccessor<T>

/**
 * 创建一个tab storage存储器。
 */
export function createTabStorage<T>(bucketName: string, defaultValue?: T | (() => T), defaultFunction?: boolean): StorageAccessor<T | null> {
    const currentTab = useCurrentTab()
    if(currentTab === undefined) return createMemoryStorage(bucketName, defaultValue as any, defaultFunction as any)
    const memory = currentTab.view.value.memoryStorage

    return {
        get(): T | null {
            const initValue = memory[bucketName]
            if(initValue !== undefined) {
                return initValue as T
            }else if(defaultFunction && defaultValue instanceof Function) {
                return defaultValue()
            }else if(defaultValue !== undefined) {
                return defaultValue as T
            }else{
                return null
            }
        },
        set(value: T): void {
            if(value !== null) {
                memory[bucketName] = value
            }else{
                delete memory[bucketName]
            }
        }
    }
}

export function useTabStorage<T>(bucketName: string): Ref<T | null>
export function useTabStorage<T>(bucketName: string, defaultValue: T): Ref<T>
export function useTabStorage<T>(bucketName: string, defaultValue: () => T, defaultFunction: true): Ref<T>

/**
 * 引用一个tab storage存储器。它使用页面的共享内存实现，也就是每个页面进程使用单独的storage，并在同一页面的历史记录之间共享。
 * 如果不属于任何页面，则它等价于useMemoryStorage。
 */
export function useTabStorage<T>(bucketName: string, defaultValue?: T | (() => T), defaultFunction?: boolean): Ref<T | null> {
    const currentTab = useCurrentTab()
    if(currentTab === undefined) return useMemoryStorage(bucketName, defaultValue as any, defaultFunction as any)
    
    const accessor = createTabStorage<T>(bucketName, defaultValue as any, defaultFunction as any)
    const data: Ref<T | null> = ref(accessor.get()) as Ref<T | null>

    watch(currentTab.active, active => {
        if(active) {
            data.value = accessor.get() as T | null
        }
    })

    watch(data, value => accessor.set(value as T), {deep: true})

    return data
}

/**
 * 单次取出一个tab storage存储的值。
 */
export function getTabStorage<T>(bucketName: string): T | null {
    return createTabStorage<T>(bucketName).get()
}

export function createRouteStorage<T>(bucketName: string): StorageAccessor<T | null>
export function createRouteStorage<T>(bucketName: string, defaultValue: T): StorageAccessor<T>
export function createRouteStorage<T>(bucketName: string, defaultValue: () => T, defaultFunction: true): StorageAccessor<T>

/**
 * 创建一个route storage存储器。
 */
export function createRouteStorage<T>(bucketName: string, defaultValue?: T | (() => T), defaultFunction?: boolean): StorageAccessor<T | null> {
    const currentTab = useCurrentTab()
    if(currentTab === undefined) return createMemoryStorage(bucketName, defaultValue as any, defaultFunction as any)
    const memory = currentTab.page.value.storage

    return {
        get(): T | null {
            const initValue = memory[bucketName]
            if(initValue !== undefined) {
                return initValue as T
            }else if(defaultFunction && defaultValue instanceof Function) {
                return defaultValue()
            }else if(defaultValue !== undefined) {
                return defaultValue as T
            }else{
                return null
            }
        },
        set(value: T): void {
            if(value !== null) {
                memory[bucketName] = value
            }else{
                delete memory[bucketName]
            }
        }
    }
}

export function useRouteStorage<T>(bucketName: string): Ref<T | null>
export function useRouteStorage<T>(bucketName: string, defaultValue: T): Ref<T>
export function useRouteStorage<T>(bucketName: string, defaultValue: () => T, defaultFunction: true): Ref<T>

/**
 * 引用一个route storage存储器。它使用路由的存储空间实现，也就是每次路由都拥有单独的storage，适合用于为页面记录那些需要在历史记录中恢复的信息。
 * 如果不属于任何页面，则它等价于useMemoryStorage。
 */
export function useRouteStorage<T>(bucketName: string, defaultValue?: T | (() => T), defaultFunction?: boolean): Ref<T | null> {
    const currentTab = useCurrentTab()
    if(currentTab === undefined) return useMemoryStorage(bucketName, defaultValue as any, defaultFunction as any)
    
    const accessor = createRouteStorage<T>(bucketName, defaultValue as any, defaultFunction as any)
    const data: Ref<T | null> = ref(accessor.get()) as Ref<T | null>

    watch(data, value => accessor.set(value as T), {deep: true})

    return data
}

/**
 * 单次取出一个route storage存储的值。
 */
export function getRouteStorage<T>(bucketName: string): T | null {
    return createRouteStorage<T>(bucketName).get()
}

const [installMemoryStorageManager, useMemoryStorageManager] = installation(function () {
    const memory = new Map<string, unknown>()
    return {memory}
})

export { installMemoryStorageManager }