import { computed, onUnmounted, ref, watch } from "vue"
import { Illust } from "@/functions/http-client/api/illust"
import { flatResponse, mapResponse } from "@/functions/http-client"
import {
    AllSlice, ListIndexSlice, SliceDataView, SliceOrPath,
    useFetchListEndpoint, useFetchSinglePathEndpoint, usePostFetchHelper, usePostPathFetchHelper, useSliceDataView, useSliceDataViewByRef
} from "@/functions/fetch"
import { useViewStack } from "@/components-module/view-stack"
import { useGlobalKey } from "@/modules/keyboard"
import { installation } from "@/utils/reactivity"

export const [installImageViewContext, useImageViewContext] = installation(function (data: SliceOrPath<Illust, AllSlice<Illust> | ListIndexSlice<Illust>, number[]>, modifiedCallback?: (illustId: number) => void) {
    const slice = useSlice(data)
    const subSlice = useSubSlice(slice)
    const navigator = useNavigator(slice, subSlice)
    const target = useTarget(slice, subSlice)

    useModifiedCallback(slice, data, modifiedCallback)

    return {navigator, target}
})

function useSlice(data: SliceOrPath<Illust, AllSlice<Illust> | ListIndexSlice<Illust>, number[]>): SliceDataView<Illust> {
    if(data.type === "slice") {
        return useSliceDataView(data.slice)
    }else{
        const paths = ref([...data.path])

        const { data: listEndpoint } = useFetchListEndpoint({
            paths,
            list: client => client.illust.findByIds,
            get: client => client.illust.get,
            eventFilter: {
                filter: ["entity/illust/updated", "entity/illust/deleted"],
                operation({ update, event }) {
                    if(event.eventType === "entity/illust/updated") {
                        update(i => i.id === event.illustId)
                    }else if(event.eventType === "entity/illust/deleted") {
                        paths.value = paths.value.filter(path => path !== event.illustId)
                    }
                }
            }
        })

        return useSliceDataViewByRef(listEndpoint)
    }
}

function useSubSlice(slice: SliceDataView<Illust>) {
    //collection的id，作为path。只有当slice的当前项是collection时，此值不为null。
    const parentId = computed(() => slice.data.value?.type === "COLLECTION" ? slice.data.value.id : null)

    const { data: subItems } = useFetchSinglePathEndpoint({
        path: parentId,
        list: client => async (path: number) => mapResponse(await client.illust.collection.images.get(path, {}), r => r.result),
        eventFilter: {
            filter: ["entity/illust/updated", "entity/illust/deleted"],
            operation({ remove, update, event }) {
                if(event.eventType === "entity/illust/updated" && event.illustType === "IMAGE") {
                    update(i => i.id === event.illustId)
                }else if(event.eventType === "entity/illust/deleted" && event.illustType === "IMAGE") {
                    remove(i => i.id === event.illustId)
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(i => client.illust.image.get(i.id))))
        }
    })

    return useSliceDataViewByRef(subItems)
}

function useNavigator(slice: SliceDataView<Illust>, subSlice: SliceDataView<Illust>) {
    const metrics = computed(() => ({total: slice.count.value ?? 0, current: slice.currentIndex.value}))
    const subMetrics = computed(() => slice.data.value?.type === "COLLECTION" && subSlice.count.value !== null ? {total: subSlice.count.value, current: subSlice.currentIndex.value} : null)

    const prev = () => {
        if(subMetrics.value !== null && subSlice.currentIndex.value > 0) {
            subSlice.currentIndex.value -= 1
        }else{
            prevIllust()
        }
    }

    const prevIllust = (count: number = 1) => {
        if(slice.currentIndex.value > 0) {
            if(slice.currentIndex.value >= count) {
                slice.currentIndex.value -= count
            }else{
                slice.currentIndex.value = 0
            }
            //TODO 需要一个机制，在prev到上一个collection时，使sub current index位于最后
        }
    }

    const next = () => {
        if(subMetrics.value !== null && subSlice.count.value !== null && subSlice.currentIndex.value < subSlice.count.value - 1) {
            subSlice.currentIndex.value += 1
        }else{
            nextIllust()
        }
    }

    const nextIllust = (count: number = 1) => {
        if(slice.count.value !== null && slice.currentIndex.value < slice.count.value - 1) {
            if(slice.currentIndex.value <= slice.count.value - count) {
                slice.currentIndex.value += count
            }else{
                slice.currentIndex.value = slice.count.value - 1
            }
            //TODO 同理，需要使sub current index位于最前
        }
    }

    useGlobalKey(e => {
        if(e.key === "ArrowLeft" || e.key === "ArrowUp") {
            if(e.shiftKey) {
                prevIllust(5)
            }else if(e.altKey) {
                prevIllust()
            }else{
                prev()
            }
            e.stopPropagation()
        }else if(e.key === "ArrowDown" || e.key === "ArrowRight") {
            if(e.shiftKey) {
                nextIllust(5)
            }else if(e.altKey) {
                nextIllust()
            }else{
                next()
            }
            e.stopPropagation()
        }
    })

    return {metrics, subMetrics, prev, prevIllust, next, nextIllust}
}

function useTarget(slice: SliceDataView<Illust>, subSlice: SliceDataView<Illust>) {
    const data = computed(() => {
        if(slice.data.value !== null) {
            if(slice.data.value.type === "COLLECTION") {
                return subSlice.data.value
            }else{
                return slice.data.value
            }
        }else{
            return null
        }
    })

    const id = computed(() => data.value?.id ?? null)

    const setData = usePostPathFetchHelper(client => client.illust.image.update)

    const deleteItem = usePostFetchHelper(client => client.illust.image.delete)

    return {data, id, setData, deleteItem}
}

function useModifiedCallback(slice: SliceDataView<Illust>, data: SliceOrPath<Illust, AllSlice<Illust> | ListIndexSlice<Illust>, number[]>, modifiedCallback?: (illustId: number) => void) {
    const { isClosable, closeView } = useViewStack()

    //列表清空时，自动关闭视图
    watch(slice.count, cnt => {
        if(cnt !== null && cnt <= 0 && isClosable()) {
            closeView()
        }
    })

    //组件卸载时调用回调函数，告知当前所处的illust的id
    if(modifiedCallback) onUnmounted(() => {
        if(slice.data.value !== null) {
            modifiedCallback(slice.data.value?.id)
        }
    })
}
