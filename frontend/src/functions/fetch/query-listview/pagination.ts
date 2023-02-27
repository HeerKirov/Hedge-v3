import { shallowReactive } from "vue"
import { useListeningEvent } from "@/utils/emitter"
import { QueryListview } from "./query-listview"
import { LoadedStatus, QueryInstance } from "./query-instance"

// == Pagination Listview 分页列表视图 ==
// 对Query Listview的分页包装。它以一种较为特别的模型实现分页查询。
// 数据通过{data}给出。当调用{dataUpdate}时获得分页请求，查询出最符合此分页范围的数据并返回。

export interface PaginationOptions {
    /**
     * 执行查询的延时。请求未加载的新数据会延迟一定时间，确保没有新的请求冲刷时才会确认执行。
     * 没有任何数据时，初次请求不会延时。
     */
    queryDelay?: number
}

export interface PaginationDataView<T> {
    /**
     * 响应式返回的数据结果。
     */
    data: Readonly<PaginationData<T>>
    /**
     * 提出数据更新。
     */
    dataUpdate(offset: number, limit: number): void
    /**
     * 重设位点。这并不会使底层重新请求数据，如有需要，从query endpoint调用refresh。
     * 它的实现方式实际上是清空data。以此触发相关的响应。
     */
    reset(): void
    /**
     * 代理instance实例。与query endpoint的代理一致，不过此处的find方法会自动使用data的值作为优化项。
     */
    proxy: QueryInstance<T>
}

export interface PaginationData<T> {
    metrics: {total: number | undefined, offset: number, limit: number}
    result: T[]
}

export function usePaginationDataView<T>(queryListview: QueryListview<T>, options?: PaginationOptions): PaginationDataView<T> {
    const queryDelay = options?.queryDelay ?? 250

    const data: PaginationData<T> = shallowReactive({
        metrics: {total: undefined, offset: 0, limit: 0},
        result: []
    })

    let currentQueryId = 0
    let lastDataUpdateParams: {offset: number, limit: number} | null = null
    let cacheTimer: NodeJS.Timer | null = null

    const dataUpdate = async (offset: number, limit: number) => {
        //本次查询的防乱序序号
        const queryId = ++currentQueryId
        //每次调用此方法都会清空上次的缓冲区
        if(cacheTimer !== null) clearTimeout(cacheTimer)
        //记录下最后一次查询的理论参数
        lastDataUpdateParams = { offset, limit }

        //首先判断请求的数据是否已完全加载
        if(queryListview.proxy.isRangeLoaded(offset, limit) === LoadedStatus.LOADED) {
            //如果数据已完全加载，则直接更新到data
            const result = await queryListview.proxy.queryRange(offset, limit)
            if(queryId >= currentQueryId) {
                data.metrics = { total: queryListview.proxy.syncOperations.count()!, offset, limit: result.length }
                data.result = result
            }
        }else{
            //如果未完全加载，那么将本次请求放到缓冲区，并重置倒计时
            const currentCache = {queryId, offset, limit}
            cacheTimer = setTimeout(async () => {
                if(queryId < currentQueryId) return
                const instanceCache = queryListview.instance.value
                const result = await queryListview.proxy.queryRange(currentCache.offset, currentCache.limit)
                if(instanceCache !== queryListview.instance.value) {
                    //出现一个罕见但确实能见到的情况，在查询期间实例发生了变更。
                    //当此次查询是初次加载时，这次变更会导致total的返回值变成null，从而最终导致VirtualView的响应机制卡死。
                    //(因为请求是组件发出的，total由null变null导致这次和以后都无法触发重刷机制)
                    //为了摆脱这种情况，一旦发现无效请求，就应当由分页器主动发起一次重新查询。
                    //但例外情况则是，如果此次查询不是初次加载，即total原本有有效值，那么只需要丢弃本次查询。
                    //(因为total not null时，reset能够有效触发重刷，新查询会被正常发出)
                    if(data.metrics.total == undefined) {
                        dataUpdate(offset, limit).finally()
                        cacheTimer = null
                        return
                    }
                }
                if(queryId >= currentQueryId) {
                    data.metrics = { total: queryListview.proxy.syncOperations.count()!, offset: currentCache.offset, limit: result.length }
                    data.result = result
                }
                cacheTimer = null
            }, queryListview.proxy.syncOperations.count() === null ? 0 : queryDelay)
        }
    }

    const reset = () => {
        data.result = []
        data.metrics = {total: undefined, offset: 0, limit: 0}
        lastDataUpdateParams = null
    }

    useListeningEvent(queryListview.modifiedEvent, e => {
        if(e.type === "FILTER_UPDATED") {
            //instance的filter变化时，需要重设查询位点，从头开始查起
            reset()
        }else if(lastDataUpdateParams) {
            if(e.type === "REFRESH") {
                //若仅refresh，需要记录上次请求的数据范围，并用在此处重刷数据
                //因为如果沿用实际metrics的值的话，数据总量有可能增加，那么limit的值可能会比需要的值更小，因此需要记忆理论值
                dataUpdate(lastDataUpdateParams.offset, lastDataUpdateParams.limit).finally()
            }else if(e.type === "MODIFY") {
                //在endpoint的内容变更，且变更对象在影响范围内时，对数据进行更新
                //modified事件的更新按照当前实际的metrics就可以。因为数据总量不会变化，不会造成什么bug
                if(e.index >= lastDataUpdateParams.offset && e.index < lastDataUpdateParams.offset + lastDataUpdateParams.limit) {
                    dataUpdate(lastDataUpdateParams.offset, lastDataUpdateParams.limit).finally()
                }
            }else{ //REMOVE
                //在endpoint的内容变更，且变更对象在影响范围内时，对数据进行更新
                if(e.index < lastDataUpdateParams.offset + lastDataUpdateParams.limit) {
                    dataUpdate(lastDataUpdateParams.offset, lastDataUpdateParams.limit).finally()
                }
            }
        }
    })

    return {data, dataUpdate, reset, proxy: queryListview.proxy}
}
