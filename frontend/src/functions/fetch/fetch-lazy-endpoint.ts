import { computed, inject, InjectionKey, onMounted, onUnmounted, provide, ref, Ref, watch } from "vue"
import { BasicException } from "@/functions/http-client/exceptions"
import { FetchEndpoint, FetchEndpointOptions, useFetchEndpoint } from "./fetch-endpoint"

// == Lazy Fetch Endpoint 懒加载端点调用器 ==
// 实质上是对Fetch Endpoint的包装。添加了懒加载机制，将其拆分为install和use两个函数使用。
// 首先需要像其他服务那样在上游install；之后，在下游使用到的地方use。use会复用同一个实例，因此可以用作数据缓存和复用服务。
// 基于计数机制，当不存在任何use时，不会请求数据；存在任意use之后，才能触发path请求。

interface InstallFetchEndpoint<PATH, MODEL, FORM, GE extends BasicException, UE extends BasicException, DE extends BasicException> {
    (options: FetchEndpointOptions<PATH, MODEL, FORM, GE, UE, DE>): void
}

interface UseFetchEndpoint<MODEL, FORM, UE extends BasicException> {
    (): FetchEndpoint<MODEL, FORM, UE>
}

interface LazyFetchInjection<MODEL, FORM, UE extends BasicException> {
    useCount: Ref<number>
    fetch: FetchEndpoint<MODEL, FORM, UE>
}

export function createLazyFetchEndpoint<PATH, MODEL, FORM, GE extends BasicException, UE extends BasicException, DE extends BasicException>(): [InstallFetchEndpoint<PATH, MODEL, FORM, GE, UE, DE>, UseFetchEndpoint<MODEL, FORM, UE>] {
    const symbol: InjectionKey<LazyFetchInjection<MODEL, FORM, UE>> = Symbol()

    function install(options: FetchEndpointOptions<PATH, MODEL, FORM, GE, UE, DE>) {
        const originPath = options.path

        const useCount = ref(0)

        const using = computed(() => useCount.value > 0)

        const path: Ref<PATH | null> = ref(null)

        watch(using, using => {
            if(using) {
                path.value = originPath.value
            }
        })

        watch(originPath, originPath => {
            path.value = using.value ? originPath : null
        })

        const fetch = useFetchEndpoint({...options, path})

        provide(symbol, {fetch, useCount})
    }

    function use(): FetchEndpoint<MODEL, FORM, UE> {
        const { useCount, fetch } = inject(symbol)!

        onMounted(() => useCount.value += 1)

        onUnmounted(() => useCount.value -= 1)

        return fetch
    }

    return [install, use]
}
