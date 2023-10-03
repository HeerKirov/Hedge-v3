import { installVirtualViewNavigation } from "@/components/data"
import { mapResponse } from "@/functions/http-client"
import { usePostFetchHelper } from "@/functions/fetch"
import { useListViewContext } from "@/services/base/list-view-context"
import { useSelectedState } from "@/services/base/selected-state"
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
    const navigation = installVirtualViewNavigation()
    const selfOperators = useOperators()
    const operators = useImageDatasetOperators({
        paginationData: listview.paginationData,
        listview: listview.listview,
        selector, navigation
    })

    installIllustListviewContext({listview, selector, listviewController})

    useSettingSite()

    return {paneState, listview, listviewController, selector, operators: {...operators, ...selfOperators}}
}

function useListView() {
    return useListViewContext({
        request: client => (offset, limit) => client.stagingPost.list({offset, limit}),
        eventFilter: {
            filter: ["entity/illust/updated", "entity/illust/deleted", "app/staging-post/changed"],
            operation({ event, refresh, updateOne, removeOne }) {
                if(event.eventType === "entity/illust/updated" && event.illustType === "IMAGE" && event.listUpdated) {
                    updateOne(i => i.id === event.illustId)
                }else if(event.eventType === "entity/illust/deleted" && event.illustType === "IMAGE") {
                    removeOne(i => i.id === event.illustId)
                }else if(event.eventType === "app/staging-post/changed" && (event.added.length || event.moved.length || event.deleted.length)) {
                    refresh()
                }
            },
            request: client => async items => mapResponse(await client.illust.findByIds(items.map(i => i.id)), r => r.map(i => i !== null ? i : undefined))
        }
    })
}

function useOperators() {
    const fetchUpdate = usePostFetchHelper(client => client.stagingPost.update)

    const dropToAdd = (insertIndex: number | null, images: TypeDefinition["illusts"], mode: "ADD" | "MOVE") => {
        fetchUpdate({action: mode, images: images.map(i => i.id), ordinal: insertIndex})
    }

    const removeOne = (image: StagingPostImage) => {
        fetchUpdate({action: "DELETE", images: [image.id]}).finally()
    }

    const clear = () => {
        fetchUpdate({action: "CLEAR"}).finally()
    }

    return {dropToAdd, removeOne, clear}
}
