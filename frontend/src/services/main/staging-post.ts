import { Ref } from "vue"
import { installVirtualViewNavigation } from "@/components/data"
import { mapResponse } from "@/functions/http-client"
import { usePostFetchHelper } from "@/functions/fetch"
import { useListViewContext } from "@/services/base/list-view-context"
import { useSelectedState } from "@/services/base/selected-state"
import { useSelectedPaneState } from "@/services/base/selected-pane-state"
import { useIllustViewController } from "@/services/base/view-controller"
import { installIllustListviewForPreview, useImageDatasetOperators } from "@/services/common/illust"
import { useSettingSite } from "@/services/setting"
import { StagingPostImage } from "@/functions/http-client/api/staging-post"

export function useStagingPostContext() {
    const listview = useListView()
    const selector = useSelectedState({queryListview: listview.listview, keyOf: item => item.id})
    const paneState = useSelectedPaneState("staging-post", selector)
    const listviewController = useIllustViewController()
    const navigation = installVirtualViewNavigation()
    const selfOperators = useOperators()
    const operators = useImageDatasetOperators({
        paginationData: listview.paginationData,
        listview: listview.listview,
        selector, navigation
    })

    installIllustListviewForPreview({listview, selector, listviewController})

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
                }else if(event.eventType === "app/staging-post/changed" && (event.added.length || event.deleted.length)) {
                    refresh()
                }
            },
            request: client => async items => mapResponse(await client.illust.findByIds(items.map(i => i.id)), r => r.map(i => i !== null ? i : undefined))
        }
    })

}

function useOperators() {
    const fetchUpdate = usePostFetchHelper(client => client.stagingPost.update)

    const removeOne = (image: StagingPostImage) => {
        fetchUpdate({action: "DELETE", images: [image.id]}).finally()
    }

    const clear = () => {
        fetchUpdate({action: "CLEAR"}).finally()
    }

    return {removeOne, clear}
}
