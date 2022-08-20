import { computed, ref, Ref, watch } from "vue"
import { remoteIpcClient } from "@/functions/ipc-client"

export function useLocalStorage<T>(bucketName: string): Ref<T | null>
export function useLocalStorage<T>(bucketName: string, defaultValue: T): Ref<T>
export function useLocalStorage<T>(bucketName: string, defaultValue: () => T): Ref<T>

/**
 * 引用一个local storage存储器。
 * 存储器的实现依赖于channel。不同的channel使用的bucket name有所不同，以此实现隔离。
 * @return 存储的响应式数据。null表示无值，其他表示有值
 */
export function useLocalStorage<T>(bucketName: string, defaultValue?: T | (() => T)): Ref<T | null> {
    const storageName = `com.heerkirov.hedge.v3(${remoteIpcClient.setting.channel.getCurrent()})${bucketName}`

    const data: Ref<T | null> = ref((() => {
        const value = window.localStorage.getItem(storageName)
        return value != undefined ? JSON.parse(value) : null
    })())

    watch(data, value => {
        if(value != null) {
            window.localStorage.setItem(storageName, JSON.stringify(value))
        }else{
            window.localStorage.removeItem(storageName)
        }
    }, {deep: true})

    if(defaultValue === undefined) {
        return data
    }else if(defaultValue instanceof Function) {
        let defaultValued: T | undefined = undefined
        return computed({
            get: () => data.value ?? (defaultValued !== undefined ? defaultValued : (defaultValued = defaultValue())),
            set: value => data.value = value
        })
    }else{
        return computed({
            get: () => data.value ?? defaultValue,
            set: value => data.value = value
        })
    }
}
