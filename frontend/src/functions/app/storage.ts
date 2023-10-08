import { ref, Ref, watch } from "vue"
import { remoteIpcClient } from "@/functions/ipc-client"
import { installation } from "@/utils/reactivity"

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
    const storageName = `com.heerkirov.hedge.v3(${remoteIpcClient.setting.channel.getCurrent()})${bucketName}`

    if(defaultValue === undefined) {
        const data: Ref<T | null> = ref(null)

        const initValue = window.localStorage.getItem(storageName)
        if(initValue !== null) {
            data.value = JSON.parse(initValue)
        }

        watch(data, value => {
            if(value !== null) {
                window.localStorage.setItem(storageName, JSON.stringify(value))
            }else{
                window.localStorage.removeItem(storageName)
            }
        }, {deep: true})

        return data
    }else if(defaultFunction && defaultValue instanceof Function) {
        const data: Ref<T | null> = ref(null)

        const initValue = window.localStorage.getItem(storageName)
        if(initValue !== null) {
            data.value = JSON.parse(initValue)
        }else{
            data.value = defaultValue()
        }

        watch(data, value => {
            if(value !== null) {
                window.localStorage.setItem(storageName, JSON.stringify(value))
            }else{
                window.localStorage.removeItem(storageName)
            }
        }, {deep: true})

        return data as Ref<T>
    }else{
        const data: Ref<T | null> = ref(null)

        const initValue = window.localStorage.getItem(storageName)
        if(initValue !== null) {
            data.value = JSON.parse(initValue)
        }else{
            data.value = defaultValue as T
        }

        watch(data, value => {
            if(value !== null) {
                window.localStorage.setItem(storageName, JSON.stringify(value))
            }else{
                window.localStorage.removeItem(storageName)
            }
        }, {deep: true})

        return data as Ref<T>
    }
}

export function useSessionStorage<T>(bucketName: string): Ref<T | null>
export function useSessionStorage<T>(bucketName: string, defaultValue: T): Ref<T>
export function useSessionStorage<T>(bucketName: string, defaultValue: () => T, defaultFunction: true): Ref<T>

/**
 * 引用一个session storage存储器。它的特点是只存活到窗口关闭为止。
 */
export function useSessionStorage<T>(bucketName: string, defaultValue?: T | (() => T), defaultFunction?: boolean): Ref<T | null> {
    if(defaultValue === undefined) {
        const data: Ref<T | null> = ref(null)

        const initValue = window.sessionStorage.getItem(bucketName)
        if(initValue !== null) {
            data.value = JSON.parse(initValue)
        }

        watch(data, value => {
            if(value !== null) {
                window.sessionStorage.setItem(bucketName, JSON.stringify(value))
            }else{
                window.sessionStorage.removeItem(bucketName)
            }
        }, {deep: true})

        return data
    }else if(defaultFunction && defaultValue instanceof Function) {
        const data: Ref<T | null> = ref(null)

        const initValue = window.sessionStorage.getItem(bucketName)
        if(initValue !== null) {
            data.value = JSON.parse(initValue)
        }else{
            data.value = defaultValue()
        }

        watch(data, value => {
            if(value !== null) {
                window.sessionStorage.setItem(bucketName, JSON.stringify(value))
            }else{
                window.sessionStorage.removeItem(bucketName)
            }
        }, {deep: true})

        return data as Ref<T>
    }else{
        const data: Ref<T | null> = ref(null)

        const initValue = window.sessionStorage.getItem(bucketName)
        if(initValue !== null) {
            data.value = JSON.parse(initValue)
        }else{
            data.value = defaultValue as T
        }

        watch(data, value => {
            if(value !== null) {
                window.sessionStorage.setItem(bucketName, JSON.stringify(value))
            }else{
                window.sessionStorage.removeItem(bucketName)
            }
        }, {deep: true})

        return data as Ref<T>
    }
}

export function useMemoryStorage<T>(bucketName: string): Ref<T | null>
export function useMemoryStorage<T>(bucketName: string, defaultValue: T): Ref<T>
export function useMemoryStorage<T>(bucketName: string, defaultValue: () => T, defaultFunction: true): Ref<T>

/**
 * 引用一个memory storage存储器。它使用内存实现，刷新就会丢失数据。
 */
export function useMemoryStorage<T>(bucketName: string, defaultValue?: T | (() => T), defaultFunction?: boolean): Ref<T | null> {
    const { memory } = useMemoryStorageManager()
    if(defaultValue === undefined) {
        const data: Ref<T | null> = ref(null)

        const initValue = memory.get(bucketName)
        if(initValue !== undefined) {
            data.value = initValue as T
        }

        watch(data, value => {
            if(value !== null) {
                memory.set(bucketName, value)
            }else{
                memory.delete(bucketName)
            }
        }, {deep: true})

        return data
    }else if(defaultFunction && defaultValue instanceof Function) {
        const data: Ref<T | null> = ref(null)

        const initValue = memory.get(bucketName)
        if(initValue !== undefined) {
            data.value = initValue as T
        }else{
            data.value = defaultValue()
        }

        watch(data, value => {
            if(value !== null) {
                memory.set(bucketName, value)
            }else{
                memory.delete(bucketName)
            }
        }, {deep: true})

        return data as Ref<T>
    }else{
        const data: Ref<T | null> = ref(null)

        const initValue = memory.get(bucketName)
        if(initValue !== undefined) {
            data.value = initValue as T
        }else{
            data.value = defaultValue as T
        }

        watch(data, value => {
            if(value !== null) {
                memory.set(bucketName, value)
            }else{
                memory.delete(bucketName)
            }
        }, {deep: true})

        return data as Ref<T>
    }
}

const [installMemoryStorageManager, useMemoryStorageManager] = installation(function () {
    const memory = new Map<string, unknown>()
    return {memory}
})

export { installMemoryStorageManager }