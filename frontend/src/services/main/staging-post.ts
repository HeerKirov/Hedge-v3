import { mapResponse } from "@/functions/http-client"
import { usePostFetchHelper } from "@/functions/fetch"
import { useListViewContext } from "@/services/base/list-view-context"
import { SelectedState, useSelectedState } from "@/services/base/selected-state"
import { useSelectedPaneState } from "@/services/base/selected-pane-state"
import { useIllustViewController } from "@/services/base/view-controller"
import { installIllustListviewContext, useImageDatasetOperators } from "@/services/common/illust"
import { useSettingSite } from "@/services/setting"
import { StagingPostImage } from "@/functions/http-client/api/staging-post"
import { TypeDefinition } from "@/modules/drag"

export function useStagingPostContext() {
    const listview = useListView()
    const selector = useSelectedState({queryListview: listview.listview, keyOf: item => item.id})
    const paneState = useSelectedPaneState("staging-post")
    const listviewController = useIllustViewController()
    const selfOperators = useOperators(selector)
    const operators = useImageDatasetOperators({
        listview: listview.listview, paginationData: listview.paginationData,
        listviewController, selector
    })

    installIllustListviewContext({listview, selector, listviewController})

    useSettingSite()

    return {paneState, listview, listviewController, selector, operators: {...operators, ...selfOperators}}
}

function useListView() {
    return useListViewContext({
        request: client => (offset, limit) => client.stagingPost.list({offset, limit}),
        keyOf: item => item.id,
        eventFilter: {
            filter: ["entity/illust/updated", "entity/illust/deleted", "app/staging-post/changed"],
            operation({ event, refresh, updateKey, removeKey }) {
                if(event.eventType === "entity/illust/updated" && event.illustType === "IMAGE" && event.listUpdated) {
                    updateKey(event.illustId)
                }else if(event.eventType === "entity/illust/deleted" && event.illustType === "IMAGE") {
                    removeKey(event.illustId)
                }else if(event.eventType === "app/staging-post/changed" && (event.added.length || event.moved.length || event.deleted.length)) {
                    refresh()
                }
            },
            request: client => async items => mapResponse(await client.illust.findByIds(items.map(i => i.id)), r => r.map(i => i !== null ? i : undefined))
        }
    })
}

function useOperators(selector: SelectedState<number>) {
    const fetchUpdate = usePostFetchHelper(client => client.stagingPost.update)

    const getEffectedItems = (id: number): number[] => {
        return selector.selected.value.includes(id) ? selector.selected.value : [id]
    }

    const dropToAdd = (insertIndex: number | null, images: TypeDefinition["illusts"], mode: "ADD" | "MOVE") => {
        fetchUpdate({action: mode, images: images.map(i => i.id), ordinal: insertIndex}).finally()
    }

    const removeFromStagingPost = (image: StagingPostImage) => {
        if(selector.selected.value.length === 0 || !selector.selected.value.includes(image.id)) {
            fetchUpdate({action: "DELETE", images: [image.id]}).finally()
        }else{
            const items = getEffectedItems(image.id)
            fetchUpdate({action: "DELETE", images: items}).finally()
        }
    }

    const clear = () => {
        fetchUpdate({action: "CLEAR"}).finally()
    }

    return {dropToAdd, removeFromStagingPost, clear}
}
