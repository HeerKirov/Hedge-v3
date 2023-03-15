import { onMounted, onUnmounted, ref, Ref, watch } from "vue"
import { BasicException, NotFound } from "@/functions/http-client/exceptions"
import { flatResponse, HttpClient, Response } from "@/functions/http-client"
import { AllEvents, WsEventConditions, WsEventResult } from "@/functions/ws-client"
import { restrict } from "@/utils/process"
import { objects } from "@/utils/primitives"
import { useFetchManager } from "./install"

// == Fetch List Endpoint 列表调用器 ==
// 用于处理构成列表的REST API的detail端点，通过path列表确定指定的对象。

export interface FetchListEndpoint<MODEL> {
    /**
     * 正在加载数据。
     */
    loading: Readonly<Ref<boolean>>
    /**
     * 数据内容。
     */
    data: Readonly<Ref<(MODEL | null)[]>>
    /**
     * 手动刷新数据。
     */
    refreshData(): void
}

export interface FetchListEndpointOptions<PATH, MODEL, GE extends BasicException> {
    /**
     * 决定此端点的的path属性。
     * 当path变化时，自动重新请求新的对象。不过会被重新请求的只有那些新增项，已存在的项不会被一同重新请求。
     */
    paths: Ref<PATH[] | null>
    /**
     * list批量操作函数。此方法存在时，批量请求不会使用get，而是会使用此方法。
     * @param httpClient
     */
    list?(httpClient: HttpClient): (path: PATH[]) => Promise<Response<(MODEL | null)[], GE | NotFound>>
    /**
     * retrieve操作的函数。
     */
    get(httpClient: HttpClient): (path: PATH) => Promise<Response<MODEL, GE | NotFound>>
    /**
     * 事件过滤器。提供一个过滤器，以从wsEvents中过滤当前对象的变更通知。获得变更通知后，自动刷新对象。
     * tips: 不要直接解包context。解包会使path的内容被固定，失去响应性。应该直接取用path，或在返回函数内解包context。
     */
    eventFilter?: EventFilter<MODEL>
    /**
     * 在path变化之前发生调用的事件。
     */
    beforePath?(): void
    /**
     * 在path变化之后发生调用的事件。
     */
    afterPath?(): void
    /**
     * 在get成功之后调用的事件。给出的值是受影响的path和data的列表。
     * 需要注意的是，在任何情况下data的变更都会触发此事件，类似于一个内置的watch方法，不过它只触发于结果数据，loading状态的null不会引起触发。
     * 包括event触发的变更，甚至包括对象已删除，同样会调用此事件。
     */
    afterRetrieve?(path: PATH[], data: (MODEL | null)[], type: "UPDATE" | "DELETE" | "PATH_CHANGED" | "EVENT" | "MANUAL"): void
}

export interface FetchSinglePathListEndpointOptions<PATH, MODEL, GE extends BasicException> {
    /**
     * 决定此端点的的path属性。
     * 当path变化时，自动重新请求新的对象。不过会被重新请求的只有那些新增项，已存在的项不会被一同重新请求。
     */
    path: Ref<PATH | null>
    /**
     * list批量操作函数。
     */
    list(httpClient: HttpClient): (path: PATH) => Promise<Response<(MODEL | null)[], GE | NotFound>>
    /**
     * 事件过滤器。提供一个过滤器，以从wsEvents中过滤当前对象的变更通知。获得变更通知后，自动刷新对象。
     * tips: 不要直接解包context。解包会使path的内容被固定，失去响应性。应该直接取用path，或在返回函数内解包context。
     */
    eventFilter?: SinglePathEventFilter<MODEL, GE>
    /**
     * 在path变化之前发生调用的事件。
     */
    beforePath?(): void
    /**
     * 在path变化之后发生调用的事件。
     */
    afterPath?(): void
    /**
     * 在get成功之后调用的事件。给出的值是受影响的path和data的列表。
     * 需要注意的是，在任何情况下data的变更都会触发此事件，类似于一个内置的watch方法，不过它只触发于结果数据，loading状态的null不会引起触发。
     * 包括event触发的变更，甚至包括对象已删除，同样会调用此事件。
     */
    afterRetrieve?(path: PATH | null, data: (MODEL | null)[], type: "UPDATE" | "DELETE" | "PATH_CHANGED" | "EVENT" | "MANUAL"): void
}

interface EventFilter<T> {
    /**
     * 粗筛event的条件列表。
     */
    filter: WsEventConditions
    /**
     * 展开对事件的解析和执行相关操作。
     */
    operation(context: OperationContext<T>): void
}

interface SinglePathEventFilter<T, E extends BasicException> {
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
     * 命令：刷新数据。
     */
    refresh(): void
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

export function useFetchListEndpoint<PATH, MODEL, GE extends BasicException>(options: FetchListEndpointOptions<PATH, MODEL, GE>): FetchListEndpoint<MODEL> {
    const { httpClient, wsClient, handleException } = useFetchManager()

    const method = {
        list: options.list?.(httpClient),
        get: options.get(httpClient)
    }
    const paths = options.paths

    const loading: Ref<boolean> = ref(true)
    const data: Ref<(MODEL | null)[]> = ref([])

    watch(paths, async (paths, oldPaths, onInvalidate) => {
        //发送beforePath事件，前提是有oldPath
        if(oldPaths !== undefined) options.beforePath?.()

        if(paths == null || paths.length <= 0) {
            //path为空时，直接按not found处理
            loading.value = false
            data.value = []
            options.afterRetrieve?.([], [], "PATH_CHANGED")
        }else{
            let invalidate = false
            onInvalidate(() => invalidate = true)

            loading.value = true
            data.value = []

            const appendPaths = oldPaths === null || oldPaths === undefined || oldPaths.length <= 0 ? paths : paths.filter(path => oldPaths.indexOf(path) >= 0)

            const res = await fetchByPaths(appendPaths)
            if(invalidate) return

            if(res !== undefined) {
                const oldData = data.value
                data.value = paths.map((path, oldIdx) => {
                    const idx = appendPaths.indexOf(path)
                    if(idx >= 0) {
                        return res[idx]
                    }else{
                        return oldData[oldIdx]
                    }
                })
                options.afterRetrieve?.(paths, data.value, "PATH_CHANGED")
            }

            loading.value = false
        }

        //发送afterPath事件，但此事件是在path变化后发送，所以前提是有oldPath
        if(oldPaths !== undefined) options.afterPath?.()
    }, {immediate: true})

    if(options.eventFilter) {
        const emitter = wsClient.on(options.eventFilter.filter)

        const restrictedRefresh = restrict({interval: 100, func() { refreshData().finally() }})

        onMounted(() => emitter.addEventListener(receiveEvent))
        onUnmounted(() => emitter.removeEventListener(receiveEvent))

        const receiveEvent = async (e: WsEventResult) => {
            options.eventFilter!.operation({
                ...e,
                refresh: restrictedRefresh,
                update(where: (item: MODEL) => boolean) {
                    //TODO 需要更成熟、更统一的节流方案。实际上items很大可能会分散到达，面对这种情况也需要节流，将短时间内的items收集起来统一请求
                    //选出来的items是需要异步更新的。异步过程中列表可能发生变化。
                    const updatePaths = data.value
                        .map((item, idx) => ({item, idx}))
                        .filter(({ item }) => item !== null && where(item))
                        .map(({ idx }) => paths.value![idx])
                    if(updatePaths.length) {
                        fetchByPaths(updatePaths).then(res => {
                            if(res !== undefined && paths.value !== null && paths.value.length > 0) {
                                const resItems = updatePaths.map((path, idx) => ({path, item: res[idx]}))
                                for(const { path, item } of resItems) {
                                    const idx = paths.value.indexOf(path)
                                    if(idx >= 0) {
                                        data.value[idx] = item
                                    }
                                }
                            }
                        })
                    }
                },
                remove(where: (item: MODEL) => boolean) {
                    //delete过程是同步的。因此可以放心地对列表做筛选和更改。
                    for(let i = data.value.length - 1; i >= 0; --i) {
                        const value = data.value[i]
                        if(value !== null && where(value)) {
                            data.value[i] = null
                            break
                        }
                    }
                }
            })
        }
    }

    const refreshData = async () => {
        if(paths.value !== null) {
            const currentPath = paths.value
            loading.value = true
            const res = await fetchByPaths(currentPath)
            if(currentPath !== paths.value) return
            if(res !== undefined) {
                data.value = res
            }
            loading.value = false
        }
    }

    const fetchByPaths = async (paths: PATH[]): Promise<(MODEL | null)[] | undefined> => {
        if(method.list) {
            const res = await method.list(paths)
            if(res.ok) {
                return res.data
            }else if(res.exception && res.exception.code !== "NOT_FOUND") {
                //not found类错误会被包装，因此不会抛出
                handleException(res.exception)
            }
        }else{
            const res = flatResponse(await Promise.all(paths.map(path => method.get(path))))
            if(res.ok) {
                return res.data.map(i => i ?? null)
            }else if(res.exception && res.exception.code !== "NOT_FOUND") {
                //not found类错误会被包装，因此不会抛出
                handleException(res.exception)
            }
        }
        return undefined
    }

    return {data, loading, refreshData}
}

export function useFetchSinglePathEndpoint<PATH, MODEL, GE extends BasicException>(options: FetchSinglePathListEndpointOptions<PATH, MODEL, GE>): FetchListEndpoint<MODEL> {
    const { httpClient, wsClient, handleException } = useFetchManager()

    const method = {
        list: options.list(httpClient)
    }
    const path = options.path

    const loading: Ref<boolean> = ref(true)
    const data: Ref<(MODEL | null)[]> = ref([])

    watch(path, async (newPath, oldPath, onInvalidate) => {
        //发送beforePath事件，前提是有oldPath
        if(oldPath !== undefined) options.beforePath?.()

        if(newPath == null) {
            //path为空时，直接按not found处理
            loading.value = false
            data.value = []
            options.afterRetrieve?.(null, [], "PATH_CHANGED")
        }else{
            let invalidate = false
            onInvalidate(() => invalidate = true)

            loading.value = true
            data.value = []

            const res = await method.list(newPath)
            if(invalidate) return

            if(res.ok) {
                data.value = res.data
                options.afterRetrieve?.(newPath, data.value, "PATH_CHANGED")
            }else if(res.exception) {
                handleException(res.exception)
            }

            loading.value = false
        }

        //发送afterPath事件，但此事件是在path变化后发送，所以前提是有oldPath
        if(oldPath !== undefined) options.afterPath?.()
    }, {immediate: true})

    if(options.eventFilter) {
        const emitter = wsClient.on(options.eventFilter.filter)

        const restrictedRefresh = restrict({interval: 100, func() { refreshData().finally() }})

        const requestMethod = options.eventFilter.request?.(httpClient)

        onMounted(() => emitter.addEventListener(receiveEvent))
        onUnmounted(() => emitter.removeEventListener(receiveEvent))

        const receiveEvent = async (e: WsEventResult) => {
            options.eventFilter!.operation({
                ...e,
                refresh: restrictedRefresh,
                update(where: (item: MODEL) => boolean) {
                    if(!requestMethod) throw new Error("options.eventFilter.request is satisfied.")

                    //TODO 需要更成熟、更统一的节流方案。实际上items很大可能会分散到达，面对这种情况也需要节流，将短时间内的items收集起来统一请求
                    //选出来的items是需要异步更新的。异步过程中列表可能发生变化。
                    const updateItems = data.value.filter(i => i !== null && where(i)) as MODEL[]
                    if(updateItems.length) {
                        requestMethod(updateItems).then(res => {
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
                    }
                },
                remove(where: (item: MODEL) => boolean) {
                    //delete过程是同步的。因此可以放心地对列表做筛选和更改。
                    for(let i = data.value.length - 1; i >= 0; --i) {
                        const value = data.value[i]
                        if(value !== null && where(value)) {
                            data.value.splice(i, 1)
                            break
                        }
                    }
                }
            })
        }
    }

    const refreshData = async () => {
        if(path.value !== null) {
            const currentPath = path.value
            loading.value = true
            const res = await method.list(currentPath)
            if(currentPath !== path.value) return
            if(res.ok) {
                data.value = res.data
            }else if(res.exception) {
                handleException(res.exception)
            }
            loading.value = false
        }
    }

    return {data, loading, refreshData}
}
