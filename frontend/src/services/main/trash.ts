import { computed } from "vue"
import { flatResponse } from "@/functions/http-client"
import { TrashQueryFilter } from "@/functions/http-client/api/trash"
import { useFetchEndpoint, usePostFetchHelper } from "@/functions/fetch"
import { useListViewContext } from "@/services/base/list-view-context"
import { SelectedState, useSelectedState } from "@/services/base/selected-state"
import { useSelectedPaneState } from "@/services/base/selected-pane-state"
import { useTrashedImageViewController } from "@/services/base/view-controller"
import { useMessageBox } from "@/modules/message-box"
import { useToast } from "@/modules/toast"
import { installation } from "@/utils/reactivity"

export const [installTrashContext, useTrashContext] = installation(function() {
    const listview = useListView()
    const selector = useSelectedState({queryListview: listview.listview, keyOf: item => item.id})
    const paneState = useSelectedPaneState("trashed-image")
    const listviewController = useTrashedImageViewController()
    const operators = useOperators(selector)

    return {paneState, listview, listviewController, selector, operators}
})

function useListView() {
    return useListViewContext({
        defaultFilter: <TrashQueryFilter>{order: "-trashedTime"},
        request: client => (offset, limit, filter) => client.trash.list({offset, limit, ...filter}),
        keyOf: item => item.id,
        eventFilter: {
            filter: ["entity/trashed-image/created", "entity/trashed-image/processed"],
            operation({ event, refresh, removeOne: remove }) {
                if(event.eventType === "entity/trashed-image/created") {
                    refresh()
                }else if(event.eventType === "entity/trashed-image/processed") {
                    remove(i => event.imageIds.includes(i.id))
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.trash.get(a.id))))
        }
    })

}

function useOperators(selector: SelectedState<number>) {
    const toast = useToast()
    const message = useMessageBox()
    const fetchRestore = usePostFetchHelper(client => client.trash.restore)
    const fetchDelete = usePostFetchHelper(client => client.trash.delete)

    const getEffectedItems = (id: number): number[] => {
        return selector.selected.value.includes(id) ? selector.selected.value : [id]
    }

    const restoreItem = async (id: number) => {
        const items = getEffectedItems(id)
        if(await message.showYesNoMessage("prompt", `确定要还原${items.length > 1 ? items.length + '个已选择' : '此'}项吗？`, "项将被放回原处，并尽可能复原删除前的关系。")) {
            if(await fetchRestore(items)) {
                toast.toast("已还原", "info", `已将${items.length}个项放回原处。`)
            }
        }
    }

    const deleteItem = async (id: number) => {
        const items = getEffectedItems(id)
        if(await message.showYesNoMessage("warn", `确定要彻底删除${items.length > 1 ? items.length + '个已选择' : '此'}项吗？`, "此操作不可撤回。")) {
            await fetchDelete(items)
        }
    }

    return {restoreItem, deleteItem}
}

export function useTrashDetailPane() {
    const { selector } = useTrashContext()
    
    const path = computed<number | null>(() => selector.lastSelected.value ?? selector.selected.value[selector.selected.value.length - 1] ?? null)

    const { data } = useFetchEndpoint({
        path,
        get: client => client.trash.get,
        eventFilter: c => event => c.path !== null && event.eventType === "entity/trashed-image/processed" && event.imageIds.includes(c.path)
    })

    return {data, path, selector}
}
