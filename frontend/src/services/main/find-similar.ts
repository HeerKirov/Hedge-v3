import { installVirtualViewNavigation } from "@/components/data"
import { FindSimilarResult } from "@/functions/http-client/api/find-similar"
import { QueryListview, useFetchEndpoint } from "@/functions/fetch"
import { flatResponse } from "@/functions/http-client"
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


export function useFindSimilarDetailPanel() {
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

    return {data}
}
