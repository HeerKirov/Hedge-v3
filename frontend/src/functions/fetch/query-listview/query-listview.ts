import { onMounted, onUnmounted, Ref, shallowRef, watch } from "vue"
import { AllEvents, WsEventConditions, WsEventResult } from "@/functions/ws-client"
import { BasicException } from "@/functions/http-client/exceptions"
import { HttpClient, Response, ListResult } from "@/functions/http-client"
import { createEmitter, useRefEmitter, RefEmitter, SendRefEmitter } from "@/utils/emitter"
import { objects } from "@/utils/primitives"
import { restrict } from "@/utils/process"
import { useFetchManager } from "../install"
import { createQueryInstance, ModifiedEvent, QueryArguments, QueryInstance } from "./query-instance"

// == Query ListView 组装完成的查询视图 ==
// 完整的响应式视图，通过对filter参数的响应，自动变换instance实例。同时，还能处理事件通知对instance的影响。

export interface QueryListviewOptions<T, K, E extends BasicException> extends QueryArguments<E> {
    /**
     * 响应式的查询条件对象。更新此对象会引发查询实例更换。
     */
    filter?: Ref<K>
    /**
     * 通过此函数回调数据源的查询结果。
     */
    request(httpClient: HttpClient): (offset: number, limit: number, filter: K) => Promise<Response<ListResult<T>, E>>
    /**
     * 事件过滤器。提供一个事件过滤器，以从wsEvents中过滤此列表可能拥有的对象的变更通知，并通知此对象完成需要的操作。
     */
    eventFilter?: EventFilter<T, E>
}

/**
 * 响应式的查询端点。它自动根据filter参数的变化来更换queryInstance。
 */
export interface QueryListview<T> {
    /**
     * 代理实例。该对象的实现代理了真实对象，在只需要使用instance的API的情况下不需要手动处理instance更换引起的对象更替。
     */
    proxy: QueryInstance<T>
    /**
     * 当前响应式返回的实例。实例是浅响应的。
     * 如果想监听实例更新，一般情况下更推荐使用refreshedEvent事件。此事件能更好地区分filter-update和refresh的情况等。
     */
    instance: Readonly<Ref<QueryInstance<T>>>
    /**
     * 相关的触发事件，包括instance的modified事件、filter更新事件、刷新事件。
     */
    modifiedEvent: RefEmitter<ListviewModifiedEvent<T>>
    /**
     * 刷新。这会强制销毁重建实例以重新请求所有数据。
     */
    refresh(): void
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
     * 命令：销毁实例，以重新请求所有数据。
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

type ListviewModifiedEvent<T> = ModifiedEvent<T> | {
    type: "FILTER_UPDATED",
    newInstance: QueryInstance<T>
} | {
    type: "REFRESH"
    newInstance: QueryInstance<T>
}

export function useQueryListview<T, K = undefined, E extends BasicException = BasicException>(options: QueryListviewOptions<T, K, E>): QueryListview<T> {
    const { httpClient, handleException } = useFetchManager()

    const method = options.request(httpClient)
    const handleError = (exception: E) => {
        const e = options.handleError?.(exception) ?? exception
        if(e !== undefined) handleException(e)
    }

    const createInstance = (filter: K | undefined) => createQueryInstance({
        request: (offset, limit) => method(offset, limit, (filter && objects.deepCopy(filter)) as K),
        handleError,
        segmentSize: options.segmentSize
    })

    const instance: Ref<QueryInstance<T>> = shallowRef(createInstance(options.filter?.value))

    if(options.filter !== undefined) watch(options.filter, filter => {
        instance.value = createInstance(filter)
        modifiedEvent.emit({type: "FILTER_UPDATED", newInstance: instance.value})
    }, {deep: true})

    const refresh = () => {
        instance.value = createInstance(options.filter?.value)
        modifiedEvent.emit({type: "REFRESH", newInstance: instance.value})
    }

    const proxy = useProxyInstance(instance)

    const modifiedEvent = useModifiedEvent(proxy)

    if(options.eventFilter !== undefined) useWsEventProcessor(options.eventFilter, proxy, refresh)

    return {proxy, instance, modifiedEvent, refresh}
}

function useProxyInstance<T>(instance: Ref<QueryInstance<T>>): QueryInstance<T> {
    const modifiedEvent = createEmitter<ModifiedEvent<T>>()

    watch(instance, (newInstance, oldInstance) => {
        //移除旧实例时要移除代理事件
        oldInstance.syncOperations.modifiedEvent.removeEventListener(modifiedEvent.emit)
        //创建新实例时又加入代理事件
        newInstance.syncOperations.modifiedEvent.addEventListener(modifiedEvent.emit)
    }, {flush: "sync"})

    onMounted(() => instance.value.syncOperations.modifiedEvent.addEventListener(modifiedEvent.emit))
    onUnmounted(() => instance.value.syncOperations.modifiedEvent.removeEventListener(modifiedEvent.emit))

    return {
        queryOne: index => instance.value.queryOne(index),
        queryRange: (offset, limit) => instance.value.queryRange(offset, limit),
        queryList: indexList => instance.value.queryList(indexList),
        isRangeLoaded: (offset, limit) => instance.value.isRangeLoaded(offset, limit),
        count: () => instance.value.count(),
        syncOperations: {
            count: () => instance.value.syncOperations.count(),
            find: (condition, priorityRange) => instance.value.syncOperations.find(condition, priorityRange),
            retrieve: index => instance.value.syncOperations.retrieve(index),
            modify: (index, newData) => instance.value.syncOperations.modify(index, newData),
            remove: index => instance.value.syncOperations.remove(index),
            modifiedEvent
        }
    }
}

function useModifiedEvent<T>(proxyInstance: QueryInstance<T>): SendRefEmitter<ListviewModifiedEvent<T>> {
    const modifiedEvent = useRefEmitter<ListviewModifiedEvent<T>>()

    onMounted(() => proxyInstance.syncOperations.modifiedEvent.addEventListener(modifiedEvent.emit))
    onUnmounted(() => proxyInstance.syncOperations.modifiedEvent.removeEventListener(modifiedEvent.emit))

    return modifiedEvent
}

function useWsEventProcessor<T, E extends BasicException>(options: EventFilter<T, E>, proxyInstance: QueryInstance<T>, refresh: () => void) {
    const { httpClient, wsClient, handleException } = useFetchManager()
    const updateMethod = options.request?.(httpClient)

    const emitter = wsClient.on(options.filter)

    const restrictedRefresh = restrict({interval: 100, func: refresh})

    onMounted(() => emitter.addEventListener(receiveEvent))
    onUnmounted(() => emitter.removeEventListener(receiveEvent))

    const receiveEvent = async (e: WsEventResult) => {
        options.operation({
            ...e,
            refresh: restrictedRefresh,
            update(where: (item: T) => boolean) {
                //TODO 节流方案需要更新:
                //需要更成熟、更统一的节流方案。实际上items很大可能会分散到达，面对这种情况也需要节流，将短时间内的items收集起来统一请求
                if(!updateMethod) throw new Error("options.eventFilter.request is satisfied.")
                const idx = proxyInstance.syncOperations.find(where)
                if(idx !== undefined) {
                    const item = proxyInstance.syncOperations.retrieve(idx)!
                    updateMethod([item]).then(res => {
                        //tips: 实例不是响应式的，按照规则，仍然需要通过sync operations操作，并散布更新事件。
                        if(res.ok) {
                            if(res.data.length > 0 && res.data[0] !== undefined) {
                                const idx = proxyInstance.syncOperations.find(where)
                                if(idx !== undefined) {
                                    proxyInstance.syncOperations.modify(idx, res.data[0])
                                }
                            }
                        }else if(res.exception) {
                            handleException(res.exception)
                        }
                    })
                }
            },
            remove(where: (item: T) => boolean) {
                //delete过程是同步的。因此可以放心地对列表做筛选和更改。
                const idx = proxyInstance.syncOperations.find(where)
                if(idx !== undefined) {
                    proxyInstance.syncOperations.remove(idx)
                }
            }
        })
    }
}
