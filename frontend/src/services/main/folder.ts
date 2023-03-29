import { computed, Ref, ref } from "vue"
import { FolderCreateForm, FolderTreeNode } from "@/functions/http-client/api/folder"
import {
    useFetchEndpoint, useFetchHelper, useFetchReactive, useFetchSinglePathEndpoint,
    usePostFetchHelper, usePostPathFetchHelper, useRetrieveHelper
} from "@/functions/fetch"
import { useLocalStorage } from "@/functions/app"
import { flatResponse, mapResponse } from "@/functions/http-client"
import { useMessageBox } from "@/modules/message-box"
import { useRouterNavigator, useRouterQueryNumber } from "@/modules/router"
import { DetailViewState, useDetailViewState, useRouterViewState } from "@/services/base/detail-view-state"
import { useListViewContext } from "@/services/base/list-view-context"
import { useSelectedState } from "@/services/base/selected-state"
import { useSelectedPaneState } from "@/services/base/selected-pane-state"
import { useIllustViewController } from "@/services/base/view-controller"
import { installVirtualViewNavigation } from "@/components/data"
import { useImageDatasetOperators } from "@/services/common/illust"
import { useFolderTableSearch } from "@/services/common/folder"
import { installation } from "@/utils/reactivity"

export const [installFolderContext, useFolderContext] = installation(function () {
    const viewState = useRouterViewState<number>(useRouterQueryNumber("MainFolder", "detail"))

    const paneState = useDetailViewState<number>()

    const listview = useFolderListview()

    const operators = useOperators(listview.data, paneState, viewState)

    const search = useFolderTableSearch(listview.data)

    const editableLockOn = useLocalStorage("folder/list/editable", false)

    return {viewState, paneState, listview, operators, search, editableLockOn}
})

function useFolderListview() {
    const { loading, data, refresh } = useFetchReactive({
        get: client => () => client.folder.tree({}),
        eventFilter: ["entity/folder/created", "entity/folder/updated", "entity/folder/deleted", "entity/folder-pin/changed"]
    })

    return {loading, data, refresh}
}

function useOperators(data: Ref<FolderTreeNode[] | undefined>, paneState: DetailViewState<number>, viewState: DetailViewState<number>) {
    const message = useMessageBox()
    const navigator = useRouterNavigator()

    const helper = useRetrieveHelper({
        update: client => client.folder.update,
        delete: client => client.folder.delete,
        handleErrorInUpdate(e) {
            if(e.code === "ALREADY_EXISTS") {
                message.showOkMessage("prompt", "该标题的节点或目录已存在。")
            }else if(e.code === "NOT_EXIST") {
                const [_, list] = e.info
                message.showOkMessage("error", "选择的父节点不存在。", `父节点：${list}`)
            }else if(e.code === "NOT_SUITABLE") {
                const [_, id] = e.info
                message.showOkMessage("error", "选择的父节点类型不适用。", `父节点：${id}`)
            }else if(e.code === "RECURSIVE_PARENT") {
                message.showOkMessage("prompt", "无法移动到此位置。", "无法将目录移动到其子目录下。")
            }else{
                return e
            }
        }
    })

    const fetchCreate = useFetchHelper({
        request: client => client.folder.create,
        handleErrorInRequest(e) {
            if(e.code === "ALREADY_EXISTS") {
                message.showOkMessage("prompt", "该标题的节点或目录已存在。")
            }else if(e.code === "NOT_EXIST") {
                const [type, list] = e.info
                if(type === "images") {
                    message.showOkMessage("error", "选择的项目不存在。", `不存在的项目: ${list.join(", ")}`)
                }else if(type === "parentId") {
                    message.showOkMessage("error", "选择的父节点不存在。", `父节点：${list}`)
                }
            }else if(e.code === "NOT_SUITABLE") {
                const [_, id] = e.info
                message.showOkMessage("error", "选择的父节点类型不适用。", `父节点：${id}`)
            }else{
                return e
            }
        }
    })

    const fetchSetPin = usePostPathFetchHelper(client => client.folder.pin.set)
    const fetchUnsetPin = usePostFetchHelper(client => client.folder.pin.unset)

    const createPosition = ref<{parentId: number | null, ordinal: number}>()

    const openCreatePosition = () => {
        if(data.value !== undefined) {
            createPosition.value = {parentId: null, ordinal: data.value.length}
        }
    }

    const openDetail = (folder: FolderTreeNode, _: number, __: number, newWindow: boolean) => {
        if(newWindow) {
            navigator.newWindow({routeName: "MainFolder", query: {detail: folder.id}})
        }else{
            viewState.openDetailView(folder.id)
        }
    }

    const setPinned = async (folder: FolderTreeNode, pinned: boolean) => {
        if(pinned) {
            await fetchSetPin(folder.id, undefined)
        }else{
            await fetchUnsetPin(folder.id)
        }
    }

    const createItem = async (form: FolderCreateForm) => {
        const res = await fetchCreate(form)
        if(res !== undefined) {
            createPosition.value = undefined
            paneState.openDetailView(res.id)
        }
    }

    const moveItem = async (folder: FolderTreeNode, targetParentId: number | null | undefined, targetOrdinal: number) => {
        await helper.setData(folder.id, {parentId: targetParentId, ordinal: targetOrdinal})
    }

    const deleteItem = async (folder: FolderTreeNode) => {
        if(await helper.deleteData(folder.id)) {
            if(paneState.detailPath.value === folder.id) {
                paneState.closeView()
            }
        }
    }

    return {openCreatePosition, createItem, moveItem, deleteItem, setPinned, createPosition, openDetail}
}

export function useFolderDetailPane() {
    const message = useMessageBox()
    const { paneState, viewState } = useFolderContext()

    const { data, setData } = useFetchEndpoint({
        path: paneState.detailPath,
        get: client => client.folder.get,
        update: client => client.folder.update,
        delete: client => client.folder.delete,
        eventFilter: c => event => (event.eventType === "entity/folder/updated" || event.eventType === "entity/folder/deleted") && event.folderId === c.path,
        afterRetrieve(path, data) {
            if(path !== null && data === null) {
                paneState.closeView()
            }
        }
    })

    const { data: exampleData } = useFetchSinglePathEndpoint({
        path: data,
        list: client => async data => {
            if(data.type === "FOLDER") {
                return mapResponse(await client.folder.images.get(data.id, {offset: 0, limit: 9, order: "-ordinal"}), r => r.result)
            }else{
                return {status: 200, ok: true, data: []}
            }
        },
        eventFilter: {
            filter: ["entity/folder-images/changed"],
            operation({ event, refresh }) {
                if(event.eventType === "entity/folder-images/changed" && event.folderId === data.value?.id) {
                    refresh()
                }
            }
        }
    })

    const exampleThumbnailFiles = computed(() => exampleData.value.filter(f => f !== null).map(f => f!.thumbnailFile))

    const setTitle = async (title: string) => {
        if(title.trim().length <= 0) {
            message.showOkMessage("prompt", "不合法的标题。", "标题不能为空。")
            return false
        }
        return title === data.value?.title || await setData({ title }, e => {
            if (e.code === "ALREADY_EXISTS") {
                message.showOkMessage("prompt", `标题为${title}的目录或节点已存在。`)
            } else {
                return e
            }
        })
    }

    const openDetail = () => {
        if(paneState.detailPath.value !== null) {
            viewState.openDetailView(paneState.detailPath.value)
        }
    }

    return {data, setTitle, exampleThumbnailFiles, openDetail}
}

export function useFolderDetailPanel() {
    const message = useMessageBox()
    const { viewState } = useFolderContext()

    const { data, deleteData } = useFetchEndpoint({
        path: viewState.detailPath,
        get: client => client.folder.get,
        update: client => client.folder.update,
        delete: client => client.folder.delete,
        eventFilter: c => event => (event.eventType === "entity/folder/updated" || event.eventType === "entity/folder/deleted") && event.folderId === c.path,
        afterRetrieve(path, data) {
            if(path !== null && data === null) {
                viewState.closeView()
            }
        }
    })

    const deleteItem = async () => {
        if(await message.showYesNoMessage("warn", "确定要删除此目录吗？", "此操作不可撤回。")) {
            if(await deleteData()) {
                viewState.closeView()
            }
        }
    }

    const listview = useListView(viewState.detailPath)
    const selector = useSelectedState({queryListview: listview.listview, keyOf: item => item.id})
    const paneState = useSelectedPaneState("illust", selector)
    const listviewController = useIllustViewController()
    const navigation = installVirtualViewNavigation()
    const operators = useImageDatasetOperators({
        paginationData: listview.paginationData,
        listview: listview.listview,
        selector, navigation,
        dataDrop: {dropInType: "folder", path: viewState.detailPath}
    })

    return {data, listview, selector, viewState, paneState, listviewController, operators, deleteItem}
}

function useListView(path: Ref<number | null>) {
    return useListViewContext({
        filter: path,
        request: client => async (offset, limit, path) => {
            if(path === null) {
                return {ok: true, status: 200, data: {total: 0, result: []}}
            }
            return await client.folder.images.get(path, {offset, limit, order: "ordinal"})
        },
        eventFilter: {
            filter: ["entity/illust/updated", "entity/illust/deleted", "entity/folder-images/changed"],
            operation({ event, refresh, update, remove }) {
                if(event.eventType === "entity/illust/updated" && event.generalUpdated) {
                    update(i => i.id === event.illustId)
                }else if(event.eventType === "entity/illust/deleted") {
                    remove(i => i.id === event.illustId)
                }else if(event.eventType === "entity/folder-images/changed" && event.folderId === path.value) {
                    refresh()
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.illust.get(a.id))))
        }
    })
}
