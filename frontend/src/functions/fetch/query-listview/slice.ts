import { computed, onBeforeMount, onMounted, onUnmounted, ref, Ref, watch } from "vue"
import { createMapProxyEmitter } from "@/utils/emitter"
import { ModifiedEvent, QueryInstance } from "./query-instance"

// == Slice 切片 ==
// 切片指从Query Instance中切取的一部分。它是一个静态数据结构，用于传递这种“一部分”的信息。
// 借助切片，可以生成切片视图。

export type Slice<T> = AllSlice<T> | ListIndexSlice<T> | SingletonSlice<T>

export interface AllSlice<T> {
    instance: QueryInstance<T>
    type: "ALL"
    focusIndex: number | null
}

export interface ListIndexSlice<T> {
    instance: QueryInstance<T>
    type: "LIST"
    indexes: number[]
    focusIndex: number | null
}

export interface SingletonSlice<T> {
    instance: QueryInstance<T>
    type: "SINGLETON"
    index: number
}

export type SliceOrPath<T, S extends Slice<T>, P extends (number[] | number)> = {
    type: "slice"
    slice: S
} | {
    type: "path"
    path: P
    focusIndex?: number
}

/**
 * 创建一个query instance，它是目标instance的mapped proxy。
 * 这是一个切片的协助工具，用来在切片之前将queryInstance映射到需要的数据类型。
 */
export function createMappedQueryInstance<T, R>(instance: QueryInstance<T>, mapper: (item: T) => R): QueryInstance<R> {
    return {
        async queryOne(index: number): Promise<R | null> {
            const ret = await instance.queryOne(index)
            return ret !== null ? mapper(ret) : null
        },
        async queryRange(offset: number, limit: number): Promise<R[]> {
            return (await instance.queryRange(offset, limit)).map(mapper)
        },
        async queryList(indexList: number[]): Promise<R[]> {
            return (await instance.queryList(indexList)).map(mapper)
        },
        count: instance.count,
        isRangeLoaded: instance.isRangeLoaded,
        syncOperations: {
            count: instance.syncOperations.count,
            find() {
                throw new Error("Sync operation Find is not supported in mapped query instance.")
            },
            retrieve() {
                throw new Error("Sync operation Retrieve is not supported in mapped query instance.")
            },
            modify() {
                throw new Error("Sync operation Modify is not supported in mapped query instance.")
            },
            remove() {
                throw new Error("Sync operation Remove is not supported in mapped query instance.")
            },
            modifiedEvent: createMapProxyEmitter({
                mount: instance.syncOperations.modifiedEvent.addEventListener,
                unmount: instance.syncOperations.modifiedEvent.removeEventListener,
                map: from => (from.type === "MODIFY" ? {
                    type: "MODIFY",
                    index: from.index,
                    value: mapper(from.value),
                    oldValue: mapper(from.oldValue)
                } : {
                    type: "REMOVE",
                    index: from.index,
                    oldValue: mapper(from.oldValue)
                })
            })
        }
    }
}

// == Slice DataView 切片视图 ==
// 切片视图从Query Instance派生。它会忠实映射原查询视图中的数据，包括其变化。
// 切片视图用在处理一部分数据映射式传递的场合。

export interface SliceDataView<T> {
    /**
     * currentIndex所指定的当前数据项。
     */
    data: Readonly<Ref<T | null>>
    /**
     * 当前切片内数据总量。
     */
    count: Readonly<Ref<number | null>>
    /**
     * 当前查看项的索引。可以通过修改此索引切换查看项。
     * 索引无法被修改到超出[0, count)的范围，超出此范围时会被强制拉回范围。
     * 需要注意的是，它通常由focusIndex指定，但含义却不同。focusIndex指在原QueryInstance中的索引，而currentIndex指在当前切片中的索引。
     */
    currentIndex: Ref<number>
}

export interface SingletonDataView<T> {
    data: Readonly<Ref<T | null>>
}

export function useSliceDataView<T>(slice: AllSlice<T> | ListIndexSlice<T>, focusIndex?: number): SliceDataView<T> {
    if(slice.type === "ALL") {
        const data: Ref<T | null> = ref(null)
        const count: Ref<number | null> = ref(null)
        const currentIndex = ref(focusIndex ?? slice.focusIndex ?? 0)

        const receivedEvent = (e: ModifiedEvent<T>) => {
            if(e.type === "MODIFY") {
                if(e.index === currentIndex.value) {
                    data.value = e.value
                }
            }else{
                if(count.value !== null) {
                    count.value -= 1
                }
                if(e.index === currentIndex.value) {
                    //删除的就是当前项。规则是将index向后推一位(实质不变)，后面没有了则向前推一位。
                    if(count.value !== null) {
                        if(currentIndex.value >= count.value) {
                               currentIndex.value -= 1
                        }else{
                            slice.instance.queryOne(currentIndex.value).then(d => data.value = d)
                        }
                    }
                }else if(e.index < currentIndex.value) {
                    //删除的是之前的项。那么将index向前推一位，内容实质不变。
                    currentIndex.value -= 1
                }
            }
        }

        onBeforeMount(async () => {
            const d = await slice.instance.queryOne(currentIndex.value)
            const cnt = await slice.instance.count()
            data.value = d
            count.value = cnt
        })

        watch(currentIndex, newIndex => {
            //监听currentIndex的变化。自动查询新对象。
            if(newIndex < 0) {
                currentIndex.value = 0
            }else if(count.value !== null && newIndex >= count.value) {
                currentIndex.value = count.value - 1
            }else{
                slice.instance.queryOne(newIndex).then(d => data.value = d)
            }
        })

        onMounted(() => slice.instance.syncOperations.modifiedEvent.addEventListener(receivedEvent))
        onUnmounted(() => slice.instance.syncOperations.modifiedEvent.removeEventListener(receivedEvent))

        return {data, count, currentIndex}
    }else{ //LIST
        const indexes = [...slice.indexes]

        const data: Ref<T | null> = ref(null)
        const count: Ref<number> = ref(indexes.length)
        const currentIndex = ref(mapFocusToCurrentIndex(focusIndex ?? slice.focusIndex ?? undefined))

        function mapFocusToCurrentIndex(focusIndex: number | undefined): number {
            if(focusIndex !== undefined) {
                const idx = indexes.indexOf(focusIndex)
                return idx >= 0 ? idx : 0
            }
            return 0
        }

        const receivedEvent = (e: ModifiedEvent<T>) => {
            if(e.type === "MODIFY") {
                if(e.index === indexes[currentIndex.value]) {
                    data.value = e.value
                }
            }else{
                const idx = indexes.indexOf(e.index)
                if(idx >= 0) {
                    //删除时，将count-1，从indexes中移除目标
                    count.value -= 1
                    indexes.splice(idx, 1)
                    if(idx < currentIndex.value) {
                        //删除的是之前的项。那么将index向前推一位，内容实质不变。
                        currentIndex.value -= 1
                    }else if(idx === currentIndex.value) {
                        //删除的就是当前项。规则是将index向后推一位(实质不变)，后面没有了则向前推一位。
                        if(currentIndex.value >= count.value) {
                            currentIndex.value -= 1
                        }else{
                            slice.instance.queryOne(currentIndex.value).then(d => data.value = d)
                        }
                    }
                }
            }
        }

        watch(currentIndex, newIndex => {
            //监听currentIndex的变化。自动查询新对象。
            if(newIndex < 0) {
                currentIndex.value = 0
            }else if(newIndex >= indexes.length) {
                currentIndex.value = indexes.length - 1
            }else{
                slice.instance.queryOne(indexes[newIndex]).then(d => data.value = d)
            }
        })

        onBeforeMount(async () => data.value = await slice.instance.queryOne(indexes[currentIndex.value]))

        onMounted(() => slice.instance.syncOperations.modifiedEvent.addEventListener(receivedEvent))
        onUnmounted(() => slice.instance.syncOperations.modifiedEvent.removeEventListener(receivedEvent))

        return {data, count, currentIndex}
    }
}

export function useSingletonDataView<T>(slice: SingletonSlice<T>): SingletonDataView<T> {
    let index: number | null = slice.index

    const data: Ref<T | null> = ref(null)

    const receivedEvent = (e: ModifiedEvent<T>) => {
        if(index !== null) {
            if(e.type === "MODIFY") {
                if(e.index === index) {
                    data.value = e.value
                }
            }else if(e.index === index) {
                //删除的就是当前持有的，那么将当前对象永久置空
                index = null
                data.value = null
            }else if(e.index < index) {
                //删除的是之前的，那么需要向前推一位
                index -= 1
            }
        }
    }

    onBeforeMount(async () => {
        if(index !== null) {
            data.value = await slice.instance.queryOne(index)
        }
    })

    onMounted(() => slice.instance.syncOperations.modifiedEvent.addEventListener(receivedEvent))
    onUnmounted(() => slice.instance.syncOperations.modifiedEvent.removeEventListener(receivedEvent))

    return {data}
}

export function useSliceDataViewByRef<T>(dataList: Ref<(T | null)[] | null>, focusIndex?: number, defaultLocation?: Ref<"first" | "last">): SliceDataView<T> {
    const data: Ref<T | null> = ref(null)
    const count: Ref<number | null> = ref(null)
    const innerIndex = ref(focusIndex ?? 0)

    //挂载时，根据currentIndex初始化，取一次数据
    onBeforeMount(() => {
        if(dataList.value !== null) {
            data.value = dataList.value[currentIndex.value] ?? null
            count.value = dataList.value.length
        }else{
            data.value = null
            count.value = null
        }
    })

    //dataList或innerIndex变更时，重新取数据
    watch([dataList, innerIndex] , ([dataList], [oldDataList]) => {
        if(defaultLocation !== undefined && dataList !== oldDataList && dataList !== null && dataList.length > 0) {
            //dataList已更换，此时需要根据defaultLocation重新定位innerIndex
            if(defaultLocation.value === "first") {
                innerIndex.value = 0
            }else{
                innerIndex.value = dataList.length - 1
            }
        }
        data.value = dataList?.[innerIndex.value] ?? null
    }, {deep: true})

    //根据dataList的长度，变更count的值，根据范围修正innerIndex的值
    watch(() => dataList.value?.length ?? null, cnt => {
        if(cnt !== null) {
            count.value = cnt
            if(cnt > 0 && innerIndex.value >= cnt) innerIndex.value = cnt - 1
            else if(cnt === 0) innerIndex.value = 0
        }else{
            count.value = null
        }
    })

    const currentIndex = computed({
        get() { return innerIndex.value },
        set(newIndex) {
            if(newIndex < 0) {
                innerIndex.value = 0
            }else if(count.value !== null && newIndex >= count.value) {
                innerIndex.value = count.value - 1
            }else{
                innerIndex.value = newIndex
            }
        }
    })

    return {data, count, currentIndex}
}

export function useSingletonDataViewByRef<T>(data: Ref<T | null>): SingletonDataView<T> {
    return {data}
}
