import { onMounted, Ref, shallowRef, watch } from "vue"
import { useVirtualViewNavigation } from "@/components/data"
import { useListeningEvent } from "@/utils/emitter"
import { QueryListview } from "./query-listview"
import { LoadedStatus } from "./query-instance"

// == Pagination 虚拟视图分页数据视图 ==
// 对Query Listview进行分页包装，向下适配VirtualView虚拟滚动视图。
// 数据通过{data}给出，滚动位置通过{state}给出，通过{setState}更新。自动根据当前滚动位置调整输出的数据范围。

export interface PaginationOptions<T> {
    /**
     * 向上对接的数据视图。
     */
    listview: QueryListview<T, unknown>
    /**
     * 将state的状态同步存储到此变量中。可以用此接入外置存储。
     */
    storage?: Ref<PaginationViewState | null>
    /**
     * 执行查询的延时。请求未加载的新数据会延迟一定时间，确保没有新请求冲刷时才会确认执行。单位ms，默认为250ms。
     * 没有任何数据时，初次请求不会延时。
     */
    queryDelay?: number
    /**
     * 在滚动范围之外，扩大多少的缓冲区。此数值给出一个小数，例如0.5表示上下各扩充50%的缓冲区。
     */
    bufferPercent?: number
}

export interface PaginationDataView<T> {
    /**
     * 提供给虚拟视图的数据。包括items数据项部分和metrics数据偏移量部分。实际数据的偏移量与state并不一致。
     */
    data: Readonly<Ref<PaginationData<T>>>
    /**
     * 虚拟视图当前滚动的位置状态，数值包括总项数total、数据项偏移量offset、数据量limit。
     * 用数据量来表达滚动位置。这种表达方式不够精确，但够用。
     */
    state: Readonly<Ref<PaginationViewState | null>>
    /**
     * 要求虚拟视图导航到指定offset的滚动位置上。
     */
    navigateTo(offset: number): void
    /**
     * 事件函数，由虚拟视图报告当前的滚动位置状态。
     */
    setState(offset: number, limit: number): void
    /**
     * 重新加载数据。这不会导致刷新行为，只是重新从queryListview获取当前范围内的数据。
     */
    reset(): void
}

export interface PaginationData<T> {
    metrics: {offset: number, limit: number}
    items: T[]
}

export interface PaginationViewState {
    total: number, offset: number, limit: number
}

export function usePaginationDataView<T>(options: PaginationOptions<T>): PaginationDataView<T> {
    const { listview, bufferPercent = 0, queryDelay = 250 } = options

    const data: Ref<PaginationData<T>> = shallowRef({metrics: {offset: 0, limit: 0}, items: []})
    const state: Ref<PaginationViewState | null> = shallowRef(null)
    const navigation = useVirtualViewNavigation()

    if(options.storage !== undefined) {
        if(options.storage.value !== null) state.value = options.storage.value
        watch(state, state => options.storage!.value = state, {deep: true})
    }

    let currentQueryId = 0
    let cacheTimer: NodeJS.Timer | null = null

    const setState = (offset: number, limit: number) => {
        if(state.value?.offset !== offset || state.value?.limit !== limit) {
            state.value = {offset, limit, total: state.value?.total ?? 0}
            dataUpdate().finally()
        }
    }

    const dataUpdate = async () => {
        if(state.value === null) return
        //根据当前的视口状态state计算应该获取数据的范围offset&limit
        const offset = Math.max(state.value.offset - Math.round(state.value.limit * bufferPercent), 0)
        const limit = Math.min(offset + state.value.limit + Math.round(state.value.limit * bufferPercent * 2), state.value.total || Infinity) - offset
        //本次查询的防乱序序号
        const queryId = ++currentQueryId
        //每次调用此方法都会清空上次的缓冲区
        if(cacheTimer !== null) clearTimeout(cacheTimer)

        //首先判断请求的数据是否已完全加载
        if(listview.proxy.isRangeLoaded(offset, limit) === LoadedStatus.LOADED) {
            //如果数据已完全加载，则直接更新到data
            const result = await listview.proxy.queryRange(offset, limit)
            if(queryId >= currentQueryId) {
                if(state.value.total !== listview.proxy.sync.count()!) {
                    state.value = {total: listview.proxy.sync.count()!, offset: state.value.offset, limit: state.value.limit}
                }
                data.value = {metrics: {offset, limit: result.length}, items: result}
            }
        }else{
            //如果未完全加载，那么将本次请求放到缓冲区，并重置倒计时
            const currentCache = {queryId, offset, limit}
            cacheTimer = setTimeout(async () => {
                if(queryId < currentQueryId) return
                const instanceCache = listview.instance.value
                const result = await listview.proxy.queryRange(currentCache.offset, currentCache.limit)
                if(instanceCache !== listview.instance.value) {
                    //出现一个罕见但确实能见到的情况，在查询期间实例发生了变更。
                    //当此次查询是初次加载时，这次变更会导致total的返回值变成null，从而最终导致VirtualView的响应机制卡死。
                    //(因为请求是组件发出的，total由null变null导致这次和以后都无法触发重刷机制)
                    //为了摆脱这种情况，一旦发现无效请求，就应当由分页器主动发起一次重新查询。
                    //但例外情况则是，如果此次查询不是初次加载，即total原本有有效值，那么只需要丢弃本次查询。
                    //(因为total not null时，reset能够有效触发重刷，新查询会被正常发出)
                    if(state.value == undefined) {
                        dataUpdate().finally()
                        cacheTimer = null
                        return
                    }
                }
                if(queryId >= currentQueryId) {
                    if(state.value === null || state.value.total !== listview.proxy.sync.count()!) {
                        state.value = {total: listview.proxy.sync.count()!, offset: state.value?.offset ?? 0, limit: state.value?.limit ?? 0}
                    }
                    data.value = {metrics: {offset: currentCache.offset, limit: result.length}, items: result}
                }
                cacheTimer = null
            }, listview.proxy.sync.count() === null ? 0 : queryDelay)
        }
    }

    const reset = () => {
        if(state.value !== null) {
            state.value = {offset: 0, limit: state.value.limit, total: Math.max(state.value.total, state.value.limit)}
        }
        dataUpdate().finally()
    }

    onMounted(dataUpdate)

    useListeningEvent(listview.modifiedEvent, e => {
        if(e.type === "FILTER_UPDATED") {
            //instance的filter变化时，需要重设查询位点，从头开始查起
            reset()
        }else if(e.type === "REFRESH") {
            //refresh直接触发数据刷新
            dataUpdate().finally()
        }else if(e.type === "MODIFY") {
            //在endpoint的内容变更，且变更对象在影响范围内时，对数据进行更新
            if(e.index >= data.value.metrics.offset && e.index < data.value.metrics.offset + data.value.metrics.limit) {
                dataUpdate().finally()
            }
        }else if(e.type === "REMOVE") {
            //在endpoint的内容变更，且变更对象在影响范围内时，对数据进行更新
            if(e.index < data.value.metrics.offset + data.value.metrics.limit) {
                dataUpdate().finally()
            }
        }
    })

    return {data, state, setState, reset, navigateTo: navigation.navigateEvent.emit}
}
