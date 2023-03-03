import { computed, ref, Ref, watch } from "vue"
import { remoteIpcClient } from "@/functions/ipc-client"

export function useLocalStorage<T>(bucketName: string): Ref<T | null>
export function useLocalStorage<T>(bucketName: string, defaultValue: T): Ref<T>
export function useLocalStorage<T>(bucketName: string, defaultValue: () => T, defaultFunction: true): Ref<T>

/**
 * 引用一个local storage存储器。
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
        if(initValue != undefined) {
            data.value = JSON.parse(initValue)
        }

        watch(data, value => {
            if(value != null) {
                window.localStorage.setItem(storageName, JSON.stringify(value))
            }else{
                window.localStorage.removeItem(storageName)
            }
        }, {deep: true})

        return data
    }else if(defaultFunction && defaultValue instanceof Function) {
        const data: Ref<T | null> = ref(null)

        const initValue = window.localStorage.getItem(storageName)
        if(initValue != undefined) {
            data.value = JSON.parse(initValue)
        }else{
            data.value = defaultValue()
        }

        watch(data, value => {
            if(value != null) {
                window.localStorage.setItem(storageName, JSON.stringify(value))
            }else{
                window.localStorage.removeItem(storageName)
            }
        }, {deep: true})

        return data as Ref<T>
    }else{
        const data: Ref<T | null> = ref(null)

        const initValue = window.localStorage.getItem(storageName)
        if(initValue != undefined) {
            data.value = JSON.parse(initValue)
        }else{
            data.value = defaultValue as T
        }

        watch(data, value => {
            if(value != null) {
                window.localStorage.setItem(storageName, JSON.stringify(value))
            }else{
                window.localStorage.removeItem(storageName)
            }
        }, {deep: true})

        return data as Ref<T>
    }
}
