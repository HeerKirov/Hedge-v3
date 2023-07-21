import { onMounted, onUnmounted, ref, Ref, toRaw, watch } from "vue"
import { BasicException } from "@/functions/http-client/exceptions"
import { HttpClient, Response } from "@/functions/http-client"
import { WsEventConditions } from "@/functions/ws-client"
import { hoard } from "@/utils/process"
import { useFetchManager } from "./install"

// == Fetch Reactive 响应式端点调用器 ==
// 专注于处理符合GET/UPDATE模型的简单端点，其MODEL与FORM内容相同。
// 端点被抽象为reactivity模型，提供方便的读写。

interface FetchReactive<T> {
    loading: Readonly<Ref<boolean>>
    updating: Readonly<Ref<boolean>>
    data: Ref<T | undefined>
    refresh(): void
}

interface FetchReactiveOptions<T> {
    get(httpClient: HttpClient): () => Promise<Response<T, BasicException>>
    update?(httpClient: HttpClient): (form: T) => Promise<Response<unknown, BasicException>>
    eventFilter?: WsEventConditions
}

export function useFetchReactive<T>(options: FetchReactiveOptions<T>): FetchReactive<T> {
    const { httpClient, wsClient, handleException } = useFetchManager()

    const loading = ref(true)
    const updating = ref(false)
    const data = ref<T>()

    let internalSetting = false

    const internalSetData = (t: T) => {
        internalSetting = true
        data.value = t
        internalSetting = false
    }

    onMounted(async () => {
        const res = await options.get(httpClient)()
        if(res.ok) {
            internalSetData(res.data)
        }
        loading.value = false
    })

    if(options.update !== undefined) watch(data, async (_, o) => {
        if(!internalSetting && o !== undefined && data.value !== undefined) {
            updating.value = true
            const res = await options.update!(httpClient)(toRaw(data.value))
            if(!res.ok && res.exception) handleException(res.exception)
            updating.value = false
        }
    }, {deep: true, flush: "sync"})

    if(options.eventFilter) {
        const emitter = wsClient.on(options.eventFilter)

        const hoardedUpdate = hoard({interval: 50, lengthenInterval: 10, maxInterval: 100, async func() {
            const res = await options.get(httpClient)()
            if(res.ok) {
                internalSetData(res.data)
            }else if(res.exception) {
                handleException(res.exception)
            }
        }})

        onMounted(() => emitter.addEventListener(hoardedUpdate))
        onUnmounted(() => emitter.removeEventListener(hoardedUpdate))
    }

    const refresh = async () => {
        loading.value = true
        const res = await options.get(httpClient)()
        if(res.ok) {
            internalSetData(res.data)
        }else if(res.exception) {
            handleException(res.exception)
        }
        loading.value = false
    }

    return {loading, updating, data, refresh}
}
