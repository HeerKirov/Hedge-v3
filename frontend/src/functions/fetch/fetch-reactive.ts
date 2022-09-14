import { onMounted, onUnmounted, ref, Ref, toRaw, watch } from "vue"
import { BasicException } from "@/functions/http-client/exceptions"
import { HttpClient, Response } from "@/functions/http-client"
import { WsEventConditions } from "@/functions/ws-client"
import { useFetchManager } from "./install"

// == Fetch Reactive 响应式端点调用器 ==
// 专注于处理符合GET/UPDATE模型的简单端点，其MODEL与FORM内容相同。
// 端点被抽象为reactivity模型，提供方便的读写。

interface FetchReactive<T> {
    loading: Readonly<Ref<boolean>>
    updating: Readonly<Ref<boolean>>
    data: Ref<T | undefined>
}

interface FetchReactiveOptions<T> {
    get(httpClient: HttpClient): () => Promise<Response<T, BasicException>>
    update?(httpClient: HttpClient): (form: T) => Promise<Response<unknown, BasicException>>
    eventFilter?(): WsEventConditions
}

export function useFetchReactive<T>(options: FetchReactiveOptions<T>): FetchReactive<T> {
    const { httpClient, wsClient, handleException } = useFetchManager()

    const loading = ref(true)
    const updating = ref(false)
    const data = ref<T>()

    const lastUpdateInterval = 100
    let lastUpdated: number | null = null

    onMounted(async () => {
        const res = await options.get(httpClient)()
        if(res.ok) {
            data.value = res.data
        }
        loading.value = false
    })

    watch(data, async (_, o) => {
        if(!options.update) throw new Error("options.update is not satisfied.")

        if(o !== undefined && data.value !== undefined) {
            updating.value = true
            const res = await options.update(httpClient)(toRaw(data.value))
            if(!res.ok && res.exception) handleException(res.exception)
            updating.value = false
            lastUpdated = Date.now()
        }
    }, {deep: true})

    if(options.eventFilter) {
        const emitter = wsClient.on(options.eventFilter())

        onMounted(() => emitter.addEventListener(receiveEvent))
        onUnmounted(() => emitter.removeEventListener(receiveEvent))

        const receiveEvent = async () => {
            const now = Date.now()
            if(!updating.value && (lastUpdated === null || now - lastUpdated >= lastUpdateInterval)) {
                lastUpdated = now

                const res = await options.get(httpClient)()
                if(res.ok) {
                    data.value = res.data
                }
            }
        }
    }

    return {loading, updating, data}
}
