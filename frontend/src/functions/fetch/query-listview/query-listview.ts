import { onBeforeMount, onMounted, onUnmounted, Ref, shallowRef, watch } from "vue"
import { AllEvents, WsEventConditions, WsEventResult } from "@/functions/ws-client"
import { BasicException } from "@/functions/http-client/exceptions"
import { HttpClient, Response, ListResult } from "@/functions/http-client"
import { createEmitter, useRefEmitter, RefEmitter, SendRefEmitter } from "@/utils/emitter"
import { objects } from "@/utils/primitives"
import { hoard } from "@/utils/process"
import { useFetchManager } from "../install"
import { createQueryInstance, ModifiedEvent, QueryArguments, QueryInstance } from "./query-instance"

// == Query ListView 组装完成的查询视图 ==
// 完整的响应式视图，通过对filter参数的响应，自动变换instance实例。同时，还能处理事件通知对instance的影响。

export interface QueryListviewOptions<T, KEY, F, E extends BasicException> extends QueryArguments<T, KEY, E> {
    /**
     * 响应式的查询条件对象。更新此对象会引发查询实例更换。
     */
    filter?: Ref<F>
    /**
     * 通过此函数回调数据源的查询结果。
     */
    request(httpClient: HttpClient): (offset: number, limit: number, filter: F) => Promise<Response<ListResult<T>, E>>
    /**
     * 事件过滤器。提供一个事件过滤器，以从wsEvents中过滤此列表可能拥有的对象的变更通知，并通知此对象完成需要的操作。
     */
    eventFilter?: EventFilter<T, KEY, E>
}

/**
 * 响应式的查询端点。它自动根据filter参数的变化来更换queryInstance。
 */
export interface QueryListview<T, KEY> {
    /**
     * 代理实例。该对象的实现代理了真实对象，在只需要使用instance的API的情况下不需要手动处理instance更换引起的对象更替。
     */
    proxy: QueryInstance<T, KEY>
    /**
     * 当前响应式返回的实例。实例是浅响应的。
     * 如果想监听实例更新，一般情况下更推荐使用refreshedEvent事件。此事件能更好地区分filter-update和refresh的情况等。
     */
    instance: Readonly<Ref<QueryInstance<T, KEY>>>
    /**
     * 相关的触发事件，包括instance的modified事件、filter更新事件、刷新事件。
     */
    modifiedEvent: RefEmitter<ListviewModifiedEvent<T, KEY>>
    /**
     * 刷新。这会强制销毁重建实例以重新请求所有数据。
     */
    refresh(): void
}

interface EventFilter<T, KEY, E extends BasicException> {
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
    operation(context: OperationContext<T, KEY>): void
}

interface OperationContext<T, KEY> {
    /**
     * 事件。
     */
    event: AllEvents
    /**
     * 发生时间。
     */
    timestamp: number
    /**
     * 命令：销毁实例，以重新请求所有数据。
     */
    refresh(): void
    /**
     * 命令：更新指定的数据项。
     * @param where 给出一个条件，符合这个条件的项会被自动更新。需要注意的是它只匹配一个项。
     */
    updateOne(where: (item: T) => boolean): void
    /**
     * 命令：使用key更新指定的数据项。
     */
    updateKey(key: KEY): void
    /**
     * 命令：移除指定的数据项。
     * @param where 给出一个条件，符合这个条件的项会被自动移除。需要注意的是它只匹配一个项。
     */
    removeOne(where: (item: T) => boolean): void
    /**
     * 命令：使用key移除指定的数据项。
     */
    removeKey(key: KEY): void
}

type ListviewModifiedEvent<T, KEY> = ModifiedEvent<T> | {
    type: "FILTER_UPDATED",
    newInstance: QueryInstance<T, KEY>
    generation: number
} | {
    type: "REFRESH"
    newInstance: QueryInstance<T, KEY>
    generation: number
}

export function useQueryListview<T, KEY, K = undefined, E extends BasicException = BasicException>(options: QueryListviewOptions<T, KEY, K, E>): QueryListview<T, KEY> {
    const { httpClient, handleException } = useFetchManager()

    const method = options.request(httpClient)
    const handleError = (exception: E) => {
        const e = options.handleError?.(exception) ?? exception
        if(e !== undefined) handleException(e)
    }

    const createInstance = (filter: K | undefined) => createQueryInstance({
        request: (offset, limit) => method(offset, limit, (filter && objects.deepCopy(filter)) as K),
        handleError,
        keyOf: options.keyOf,
        segmentSize: options.segmentSize
    })

    const instance: Ref<QueryInstance<T, KEY>> = shallowRef(createInstance(options.filter?.value))

    const generation: Ref<number> = shallowRef(1)

    if(options.filter !== undefined) onBeforeMount(() => watch(options.filter!, filter => {
        instance.value = createInstance(filter)
        generation.value += 1
        modifiedEvent.emit({type: "FILTER_UPDATED", newInstance: instance.value, generation: generation.value})
    }, {deep: true}))

    const refresh = () => {
        instance.value = createInstance(options.filter?.value)
        generation.value += 1
        modifiedEvent.emit({type: "REFRESH", newInstance: instance.value, generation: generation.value})
    }

    const proxy = useProxyInstance(instance)

    const modifiedEvent = useModifiedEvent(proxy)

    if(options.eventFilter !== undefined) useWsEventProcessor(options.eventFilter, proxy, generation, refresh)

    return {proxy, instance, modifiedEvent, refresh}
}

function useProxyInstance<T, KEY>(instance: Ref<QueryInstance<T, KEY>>): QueryInstance<T, KEY> {
    const modifiedEvent = createEmitter<ModifiedEvent<T>>()

    watch(instance, (newInstance, oldInstance) => {
        //移除旧实例时要移除代理事件
        oldInstance.modifiedEvent.removeEventListener(modifiedEvent.emit)
        //创建新实例时又加入代理事件
        newInstance.modifiedEvent.addEventListener(modifiedEvent.emit)
    }, {flush: "sync"})

    onMounted(() => instance.value.modifiedEvent.addEventListener(modifiedEvent.emit))
    onUnmounted(() => instance.value.modifiedEvent.removeEventListener(modifiedEvent.emit))

    let localPriorityRange: [number, number] | undefined

    return {
        queryOne: async index => {
            const returns = await instance.value.queryOne(index)
            localPriorityRange = [index, index + 1]
            return returns
        },
        queryRange: async (offset, limit) => {
            const returns = await instance.value.queryRange(offset, limit)
            localPriorityRange = [offset, offset + limit]
            return returns
        },
        queryList: async indexList => {
            const returns = await instance.value.queryList(indexList)
            localPriorityRange = indexList.length > 0 ? [Math.min(...indexList), Math.max(...indexList)] : undefined
            return returns
        },
        findByKey: (key, priorityRange, maxRange) => instance.value.findByKey(key, priorityRange ?? localPriorityRange, maxRange ?? 500),
        isRangeLoaded: (offset, limit) => instance.value.isRangeLoaded(offset, limit),
        count: () => instance.value.count(),
        sync: {
            count: () => instance.value.sync.count(),
            find: (condition, priorityRange) => instance.value.sync.find(condition, priorityRange ?? localPriorityRange),
            findByKey: key => instance.value.sync.findByKey(key),
            retrieve: index => instance.value.sync.retrieve(index),
            modify: (index, newData) => instance.value.sync.modify(index, newData),
            remove: index => instance.value.sync.remove(index)
        },
        modifiedEvent
    }
}

function useModifiedEvent<T, KEY>(proxyInstance: QueryInstance<T, KEY>): SendRefEmitter<ListviewModifiedEvent<T, KEY>> {
    const modifiedEvent = useRefEmitter<ListviewModifiedEvent<T, KEY>>()

    onMounted(() => proxyInstance.modifiedEvent.addEventListener(modifiedEvent.emit))
    onUnmounted(() => proxyInstance.modifiedEvent.removeEventListener(modifiedEvent.emit))

    return modifiedEvent
}

function useWsEventProcessor<T, KEY, E extends BasicException>(options: EventFilter<T, KEY, E>, proxyInstance: QueryInstance<T, KEY>, generation: Ref<number>, refresh: () => void) {
    const { httpClient, wsClient, handleException } = useFetchManager()
    const updateMethod = options.request?.(httpClient)

    const emitter = wsClient.on(options.filter)

    const hoardedRefresh = hoard({interval: 50, lengthenInterval: 10, maxInterval: 100, func: refresh})
    const hoardedUpdate = hoard<[number, ((item: T) => boolean) | undefined, KEY | undefined]>({interval: 50, lengthenInterval: 10, maxInterval: 100, async func(wheres) {
        //事件响应中的更新方法。它是一个囤积式节流函数，一次收集数个更新之后，一口气发出。

        //在开始之前，检查累计的事件总量。如果需要更新的项数超过阈值，那么不再执行单独的更新操作，而是直接刷新列表。
        if(wheres.filter(([gen, _]) => gen >= generation.value).length >= 10) {
            hoardedRefresh()
            return
        }

        //tips: 实例不是响应式的，按照规则，仍然需要通过sync operations操作并散布更新事件。
        //      因此，需要在异步操作结束后通过modify方法写入新值。
        //      但是，在异步操作期间，items的索引有改变的可能，因此在这途中需要监听删除操作，及时跟进位置变动。
        //      异步操作期间，实例也有更替的可能，因此引入了代数generation，抛弃不属于当前代的操作。
        const itemsWithIndex = wheres.map(([gen, where, key]) => {
            if(gen < generation.value) return undefined
            const idx = key !== undefined ? proxyInstance.sync.findByKey(key) : proxyInstance.sync.find(where!)
            if(idx !== undefined) {
                const r = proxyInstance.sync.retrieve(idx)
                return [idx, r]
            }
            return undefined
        }).filter(i => i !== undefined) as [number, T][]

        const gen = generation.value
        const preciseIndexes: (number | null)[] = itemsWithIndex.map(([idx, _]) => idx)
        const modifiedEvent = (e: ModifiedEvent<T>) => {
            if(e.type === "REMOVE") {
                for(let i = 0; i < preciseIndexes.length; ++i) {
                    const idx = preciseIndexes[i]
                    if(idx !== null) {
                        if(idx > e.index) preciseIndexes[i] = idx - 1
                        else if(idx === e.index) preciseIndexes[i] = null
                    }
                }
            }
        }
        const items = itemsWithIndex.map(([_, i]) => i)

        proxyInstance.modifiedEvent.addEventListener(modifiedEvent, true)
        let res: Response<(T | undefined)[], E>
        try {
            res = await updateMethod!(items)
        }finally{
            proxyInstance.modifiedEvent.removeEventListener(modifiedEvent, true)
        }
        if(gen < generation.value) {
            //generation已更新，因此抛弃当前所有更新操作
            return
        }
        
        if(res.ok) {
            if(res.data.length > 0) {
                for(let i = 0; i < res.data.length; ++i) {
                    const idx = preciseIndexes[i]
                    const newItem = res.data[i]
                    if(idx !== null && idx !== undefined && newItem !== undefined) {
                        proxyInstance.sync.modify(idx, newItem)
                    }
                }
            }
        }else if(res.exception) {
            handleException(res.exception)
        }
    }})
    const hoardedRemove = hoard<[number, ((item: T) => boolean) | undefined, KEY | undefined]>({interval: 50, lengthenInterval: 10, maxInterval: 100, async func(wheres) {
        //事件响应中的删除方法。它是一个囤积式节流函数，一次收集数个更新之后，一口气发出。

        //在开始之前，检查累计的事件总量。如果需要更新的项数超过阈值，那么不再执行单独的更新操作，而是直接刷新列表。
        const currentGenWheres = wheres.filter(([gen, _, __]) => gen >= generation.value)
        if(currentGenWheres.length >= 10) {
            hoardedRefresh()
            return
        }

        //delete过程是同步的，本来不需要将它们囤积起来。但是上面有事件总量阈值检查的需要，所以仍然需要收集数量。
        const indexes = currentGenWheres.map(([_, where, key]) => key !== undefined ? proxyInstance.sync.findByKey(key) : proxyInstance.sync.find(where!)).filter(i => i !== undefined).sort().reverse()
        for(const idx of indexes) {
            proxyInstance.sync.remove(idx!)
        }
    }})

    onMounted(() => emitter.addEventListener(receiveEvent))
    onUnmounted(() => emitter.removeEventListener(receiveEvent))

    const receiveEvent = async (e: WsEventResult) => {
        options.operation({
            ...e,
            refresh: hoardedRefresh,
            updateOne(where: (item: T) => boolean) {
                if(!updateMethod) throw new Error("options.eventFilter.request is satisfied.")
                hoardedUpdate([generation.value, where, undefined])
            },
            updateKey(key: KEY) {
                if(!updateMethod) throw new Error("options.eventFilter.request is satisfied.")
                hoardedUpdate([generation.value, undefined, key])
            },
            removeOne(where: (item: T) => boolean) {
                hoardedRemove([generation.value, where, undefined])
            },
            removeKey(key: KEY) {
                hoardedRemove([generation.value, undefined, key])
            }
        })
    }
}
