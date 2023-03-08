import { onMounted, onUnmounted, ref, Ref } from "vue"
import { AllEvents, WsEventConditions, WsEventResult } from "@/functions/ws-client"
import { BasicException } from "@/functions/http-client/exceptions"
import { HttpClient, Response, ListResult } from "@/functions/http-client"
import { ErrorHandler, useFetchManager } from "./install"
import { restrict } from "@/utils/process"
import { objects } from "@/utils/primitives"

interface QueryContinuousListviewOptions<T, E extends BasicException> {
    /**
     * 根据offset和limit取数据。
     */
    request(httpClient: HttpClient): (offset: number, limit: number) => Promise<Response<ListResult<T>, E>>
    /**
     * 事件过滤器。提供一个事件过滤器，以从wsEvents中过滤此列表可能拥有的对象的变更通知，并通知此对象完成需要的操作。
     */
    eventFilter?: EventFilter<T, E>
    /**
     * 捕获请求过程中抛出的错误。
     */
    handleError?: ErrorHandler<E>
    /**
     * 初次加载的数量。
     */
    initSize: number
    /**
     * 后续加载的数量。
     */
    continueSize?: number
    /**
     * 挂载时，自动执行初次加载，而不是等待手动。
     */
    autoInitialize?: boolean
}

export interface QueryContinuousListviewResult<T> {
    /**
     * 是否正在加载中。
     */
    loading: Readonly<Ref<boolean>>
    /**
     * 响应式返回的数据结果。
     */
    data: Readonly<Ref<QueryContinuousListviewData<T>>>
    /**
     * 重置数据，从头开始读取。
     */
    reset(): void
    /**
     * 重新加载数据，保持相同的数据查询范围。
     */
    reload(): void
    /**
     * 继续。这会继续加载后续的数据。
     */
    next(): void
    /**
     * 清空。只是清空，而不加载数据。
     */
    clear(): void
}

export interface QueryContinuousListviewData<T> {
    /**
     * 结果总数。
     */
    total: number
    /**
     * 当前已加载的结果项列表。
     */
    result: T[]
}

interface EventFilter<T, E extends BasicException> {
    /**
     * 粗筛event的条件列表。
     */
    filter: WsEventConditions
    /**
     * 相关操作中，对每个items进行更新请求时，使用的函数。
     */
    request?(httpClient: HttpClient): (items: T[]) => Promise<Response<(T | undefined)[], E>>
    /**
     * 展开对事件的解析和执行相关操作。
     */
    operation(context: OperationContext<T>): void
}

interface OperationContext<T> {
    /**
     * 事件。
     */
    event: AllEvents
    /**
     * 发生时间。
     */
    timestamp: number
    /**
     * 命令：数据重新加载，保持相同查询范围。
     */
    reload(): void
    /**
     * 命令：数据重置初始化，从头开始查询。
     */
    reset(): void
    /**
     * 命令：更新指定的数据项。
     * @param where 给出一个条件，符合这个条件的项会被自动更新。需要注意的是它只匹配一个项。
     */
    update(where: (item: T) => boolean): void
    /**
     * 命令：移除指定的数据项。
     * @param where 给出一个条件，符合这个条件的项会被自动移除。需要注意的是它只匹配一个项。
     */
    remove(where: (item: T) => boolean): void
}

export function useQueryContinuousListView<T, E extends BasicException>(options: QueryContinuousListviewOptions<T, E>): QueryContinuousListviewResult<T> {
    const { httpClient, wsClient, handleException } = useFetchManager()

    const method = options.request(httpClient)

    let version = 0

    const data: Ref<QueryContinuousListviewData<T>> = ref({total: 0, result: []})

    const loading = ref(true)

    const reload = async () => {
        //记录本次查询的版本号，同时因为刷新，使版本号+1
        const currentVersion = ++version
        //将查询范围设置为"当前已有数据总量"。如果当前正处于加载中，那么额外增加continue的范围
        const currentLimit = data.value.total + (loading.value ? (options.continueSize ?? options.initSize) : 0)

        loading.value = true

        const res = await method(0, currentLimit)
        if(currentVersion !== version) {
            //版本号已经后推，或本次查询的上限范围已经被写过的情况下，丢弃本次查询结果
            loading.value = false
            return
        }
        if(res.ok) {
            data.value = {total: res.data.total, result: res.data.result}
        }else{
            const e = options.handleError?.(res.exception) ?? res.exception
            if(e !== undefined) handleException(e)
        }
        loading.value = false
    }

    const reset = async () => {
        //记录本次查询的版本号，同时因为刷新，使版本号+1
        const currentVersion = ++version

        loading.value = true

        const res = await method(0, options.initSize)
        if(currentVersion !== version) {
            //版本号已经后推，或本次查询的上限范围已经被写过的情况下，丢弃本次查询结果
            loading.value = false
            return
        }
        if(res.ok) {
            data.value = {total: res.data.total, result: res.data.result}
        }else{
            const e = options.handleError?.(res.exception) ?? res.exception
            if(e !== undefined) handleException(e)
        }
        loading.value = false
    }

    const next = async () => {
        if(loading.value) {
            return
        }
        const currentVersion = version
        const range = (options.continueSize ?? options.initSize) + data.value.result.length

        loading.value = true

        const res = await method(data.value.result.length, options.continueSize ?? options.initSize)
        if(currentVersion !== version || data.value.result.length > range) {
            //版本号已经后推，或本次查询的上限范围已经被写过的情况下，丢弃本次查询结果
            loading.value = false
            return
        }
        if(res.ok) {
            data.value.total = res.data.total
            data.value.result.push(...res.data.result)
        }else{
            const e = options.handleError?.(res.exception) ?? res.exception
            if(e !== undefined) handleException(e)
        }
        loading.value = false
    }

    const clear = () => {
        version += 1
        data.value = {total: 0, result: []}
        loading.value = false
    }

    if(options.eventFilter) {
        const emitter = wsClient.on(options.eventFilter.filter)

        const restrictedReload = restrict({interval: 100, func: reload})
        const restrictedReset = restrict({interval: 100, func: reset})
        const updateRequestMethod = options.eventFilter.request?.(httpClient)

        onMounted(() => emitter.addEventListener(receiveEvent))
        onUnmounted(() => emitter.removeEventListener(receiveEvent))

        const receiveEvent = async (e: WsEventResult) => {
            const currentVersion = version
            options.eventFilter!.operation({
                ...e,
                reload: restrictedReload,
                reset: restrictedReset,
                update(where: (item: T) => boolean) {
                    //TODO 需要更成熟、更统一的节流方案。实际上items很大可能会分散到达，面对这种情况也需要节流，将短时间内的items收集起来统一请求
                    if(!updateRequestMethod) throw new Error("options.eventFilter.request is satisfied.")
                    //选出来的items是需要异步更新的。异步过程中列表可能发生变化。
                    const updateItems = data.value.result.filter(where)
                    if(updateItems.length) updateRequestMethod(updateItems).then(res => {
                        if(currentVersion !== version) {
                            //version变化时丢弃所有查询结果
                            return
                        }
                        if(res.ok) {
                            for(let i = 0; i < updateItems.length; ++i) {
                                //赋值时，采用的是直接修改object fields的方案。这种方案直接引用了原对象，能规避移位问题
                                //continuous API中的result是响应式的，因此能直接响应修改
                                if(res.data[i]) {
                                    objects.clear(updateItems[i])
                                    objects.copyTo(res.data[i], updateItems[i])
                                }
                            }
                        }else if(res.exception) {
                            handleException(res.exception)
                        }
                    })
                },
                remove(where: (item: T) => boolean) {
                    //delete过程是同步的。因此可以放心地对列表做筛选和更改。
                    for(let i = data.value.result.length - 1; i >= 0; --i) {
                        if(where(data.value.result[i])) {
                            data.value.result.splice(i, 1)
                            data.value.total -= 1
                            break
                        }
                    }
                }
            })
        }
    }

    if(options.autoInitialize) {
        onMounted(reset)
    }

    return {loading, data, reset, reload, next, clear}
}
