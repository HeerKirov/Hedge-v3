import { computed, ref, watch } from "vue"
import { installation } from "@/utils/reactivity"
import { useListViewContext } from "@/services/base/list-view-context"
import { BlockFileItem, BlockFileListFilter, BlockStorageListFilter, BlockStorageSummary } from "@/functions/http-client/api/file-storage"
import type { ModifiedEvent } from "@/functions/fetch/query-listview/query-instance"
import { useSelectedState } from "@/services/base/selected-state"
import { useSelectedPaneState } from "@/services/base/selected-pane-state"
import { useListeningEvent } from "@/utils/emitter"
import { useStorageFileViewController } from "@/services/base/view-controller"

export const [installBlockListContext, useBlockListContext] = installation(function() {
    const listview = useBlockListView()
    const selector = useSelectedState({queryListview: listview.listview, keyOf: item => item.name ? parseInt(item.name, 16) : -1})

    return {listview, selector}
})

function useBlockListView() {
    return useListViewContext<BlockStorageSummary, number, BlockStorageListFilter>({
        defaultFilter: {order: "-name"},
        request: client => async (offset, limit, filter) => {
            const response = await client.fileStorage.listBlocks(filter)
            if(response.ok) {
                return {ok: true, status: 200, data: {total: response.data.length, result: response.data.slice(offset, offset + limit)}}
            }else{
                return {ok: false, exception: response.exception, data: {total: 0, result: []}}
            }
        },
        keyOf: item => item.name ? parseInt(item.name, 16) : -1
    })
}

type BlockListviewModifiedEvent =
    | ModifiedEvent<BlockStorageSummary>
    | {type: "FILTER_UPDATED"}
    | {type: "REFRESH"}

export function useBlockDetailPane() {
    const { listview: listViewCtx, selector } = useBlockListContext()
    const queryListview = listViewCtx.listview

    const path = computed(() => selector.lastSelected.value ?? selector.selected.value[selector.selected.value.length - 1] ?? null)

    const data = ref<BlockStorageSummary | null>(null)
    const loading = ref(false)

    const refreshDetail = async () => {
        const p = path.value
        if(p === null) {
            data.value = null
            loading.value = false
            return
        }
        loading.value = true
        const idx = await queryListview.proxy.findByKey(p)
        if(idx === undefined) {
            data.value = null
        }else{
            data.value = await queryListview.proxy.queryOne(idx)
        }
        loading.value = false
    }

    watch(path, () => { void refreshDetail() }, {immediate: true})

    useListeningEvent(queryListview.modifiedEvent, (e: BlockListviewModifiedEvent) => {
        if(e.type === "FILTER_UPDATED" || e.type === "REFRESH") {
            void refreshDetail()
        }else if(e.type === "MODIFY") {
            if(path.value !== null && (e.value.name ? parseInt(e.value.name, 16) : -1) === path.value) {
                data.value = e.value
            }
        }else if(e.type === "REMOVE") {
            if(path.value !== null && (e.oldValue.name ? parseInt(e.oldValue.name, 16) : -1) === path.value) {
                data.value = null
            }
        }
    })

    return {path, data, loading, selector, refreshDetail}
}

export const [installFileListContext, useFileListContext] = installation(function(block: string) {
    const listview = useBlockFileListView(block)
    const listviewController = useStorageFileViewController()
    const selector = useSelectedState({alias: "file", queryListview: listview.listview, keyOf: item => item.id})
    const paneState = useSelectedPaneState("storage-block-file")

    return {block, listview, listviewController, selector, paneState}
})

function useBlockFileListView(block: string) {
    return useListViewContext<BlockFileItem, number, BlockFileListFilter>({
        defaultFilter: {order: "-id"},
        request: client => async (offset, limit, filter) => {
            return await client.fileStorage.listBlockFiles(block, {offset, limit, ...filter})
        },
        keyOf: item => item.id
    })
}

type FileListviewModifiedEvent =
    | ModifiedEvent<BlockFileItem>
    | {type: "FILTER_UPDATED"}
    | {type: "REFRESH"}

export function useFileDetailPane() {
    const { listview: listViewCtx, selector } = useFileListContext()
    const queryListview = listViewCtx.listview

    const path = computed(() => selector.lastSelected.value ?? selector.selected.value[selector.selected.value.length - 1] ?? null)

    const data = ref<BlockFileItem | null>(null)
    const loading = ref(false)

    const refreshDetail = async () => {
        const p = path.value
        if(p === null) {
            data.value = null
            loading.value = false
            return
        }
        loading.value = true
        const idx = await queryListview.proxy.findByKey(p)
        if(idx === undefined) {
            data.value = null
        }else{
            data.value = await queryListview.proxy.queryOne(idx)
        }
        loading.value = false
    }

    watch(path, () => { void refreshDetail() }, {immediate: true})

    useListeningEvent(queryListview.modifiedEvent, (e: FileListviewModifiedEvent) => {
        if(e.type === "FILTER_UPDATED" || e.type === "REFRESH") {
            void refreshDetail()
        }else if(e.type === "MODIFY") {
            if(path.value !== null && e.value.id === path.value) {
                data.value = e.value
            }
        }else if(e.type === "REMOVE") {
            if(path.value !== null && e.oldValue.id === path.value) {
                data.value = null
            }
        }
    })

    return {path, data, loading, selector, refreshDetail}
}
