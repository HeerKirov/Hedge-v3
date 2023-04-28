import { ref, Ref, watch } from "vue"
import { installVirtualViewNavigation } from "@/components/data"
import { FindSimilarDetailResult, FindSimilarResult, FindSimilarResultImage } from "@/functions/http-client/api/find-similar"
import { QueryListview, useFetchEndpoint } from "@/functions/fetch"
import { flatResponse } from "@/functions/http-client"
import { platform } from "@/functions/ipc-client"
import { useMessageBox } from "@/modules/message-box"
import { DetailViewState, useDetailViewState } from "@/services/base/detail-view-state"
import { useListViewContext } from "@/services/base/list-view-context"
import { installation } from "@/utils/reactivity"

export const [installFindSimilarContext, useFindSimilarContext] = installation(function () {
    const paneState = useDetailViewState<number>()
    const listview = useListView()
    const operators = useOperators(paneState, listview.listview)

    installVirtualViewNavigation()

    return {paneState, listview, operators}
})

function useListView() {
    return useListViewContext({
        request: client => (offset, limit) => client.findSimilar.result.list({offset, limit}),
        eventFilter: {
            filter: ["backend/similar-finder/result-added", "backend/similar-finder/result-resolved", "backend/similar-finder/result-deleted"],
            operation({ event, refresh, remove }) {
                if(event.eventType === "backend/similar-finder/result-added" && event.count > 0) {
                    refresh()
                }else if(event.eventType === "backend/similar-finder/result-resolved" || event.eventType === "backend/similar-finder/result-deleted") {
                    remove(i => i.id === event.resultId)
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.findSimilar.result.get(a.id))))
        }
    })
}

function useOperators(paneState: DetailViewState<number>, listview: QueryListview<FindSimilarResult>) {


    return {}
}


export const [installFindSimilarDetailPanel, useFindSimilarDetailPanel] = installation(function () {
    const message = useMessageBox()
    const { paneState } = useFindSimilarContext()

    const { data, setData: resolveIt, deleteData: deleteIt } = useFetchEndpoint({
        path: paneState.detailPath,
        get: client => client.findSimilar.result.get,
        update: client => client.findSimilar.result.resolve,
        delete: client => client.findSimilar.result.delete,
        eventFilter: c => event => (event.eventType === "backend/similar-finder/result-resolved" || event.eventType === "backend/similar-finder/result-deleted") && c.path === event.resultId,
        afterRetrieve(path, data) {
            if(path !== null && data === null) {
                paneState.closeView()
            }
        }
    })

    const selector = useDetailPanelSelector(data)

    return {data, selector}
})

function useDetailPanelSelector(data: Ref<FindSimilarDetailResult | null>) {
    const selected = ref<FindSimilarResultImage[]>([])
    const lastSelected = ref<FindSimilarResultImage | null>(null)
    const singleSelected = ref<{a: FindSimilarResultImage | null, b: FindSimilarResultImage | null, nextUse: "a" | "b"}>({a: null, b: null, nextUse: "a"})

    watch(data, data => {
        if(data !== null) {
            if(data.images.length >= 2) {
                selected.value = [data.images[0], data.images[1]]
                singleSelected.value = {a: data.images[0], b: data.images[1], nextUse: "a"}
                lastSelected.value = data.images[0]
            }else if(data.images.length === 1) {
                selected.value = [data.images[0]]
                singleSelected.value = {a: data.images[0], b: null, nextUse: "b"}
                lastSelected.value = data.images[0]
            }else{
                selected.value = []
                singleSelected.value = {a: null, b: null, nextUse: "a"}
                lastSelected.value = null
            }
        }else{
            selected.value = []
            singleSelected.value = {a: null, b: null, nextUse: "a"}
            lastSelected.value = null
        }
    }, {immediate: true})

    const click = (index: number, event: MouseEvent) => {
        const item = data.value!.images[index]
        if(!(item.type === singleSelected.value.a?.type && item.id === singleSelected.value.a?.id) && !(item.type === singleSelected.value.b?.type && item.id === singleSelected.value.b?.id)) {
            if(singleSelected.value.nextUse === "a") {
                singleSelected.value = {
                    a: item,
                    b: singleSelected.value.b,
                    nextUse: "b"
                }
            }else{
                singleSelected.value = {
                    a: singleSelected.value.a,
                    b: item,
                    nextUse: "a"
                }
            }
        }

        if(event.shiftKey) {
            //按下SHIFT，连选加入选择
            if(lastSelected.value !== null) {
                const lastSelectedIndex = data.value!.images.findIndex(i => i.type === lastSelected.value!.type && i.id === lastSelected.value!.id)
                const slice = lastSelectedIndex < 0 ? data.value!.images.slice(0, index) : lastSelectedIndex < index ? data.value!.images.slice(lastSelectedIndex + 1, index + 1) : data.value!.images.slice(index, lastSelectedIndex)
                const filteredSlice = slice.filter(i => !selected.value.some(s => s.type === i.type && s.id === i.id))
                selected.value = [...selected.value, ...filteredSlice]
            }
        }else if((platform === "darwin" && event.metaKey) || (platform !== "darwin" && event.ctrlKey)) {
            //按下CTRL，点选加入选择
            const idx = selected.value.findIndex(i => i.type === item.type && i.id === item.id)
            if(idx >= 0) {
                //tips: 取消选择的观感不好，与AB选项有冲突，暂且取消这个功能
                //selected.value.splice(idx, 1)
            }else{
                selected.value.push(item)
            }
        }else{
            //单选，根据singleSelected更换选择
            selected.value = [singleSelected.value.a, singleSelected.value.b].filter(i => i !== null) as FindSimilarResultImage[]
        }

        lastSelected.value = item
    }

    return {selected, lastSelected, singleSelected, click}
}
