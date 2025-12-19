import { computed, Ref, ref, watch } from "vue"
import { FolderCreateForm, FolderTreeNode } from "@/functions/http-client/api/folder"
import {
    useFetchEndpoint, useFetchHelper, useFetchReactive, useFetchSinglePathEndpoint,
    usePostFetchHelper, usePostPathFetchHelper, useRetrieveHelper
} from "@/functions/fetch"
import { useLocalStorage } from "@/functions/app"
import { mapResponse } from "@/functions/http-client"
import { EditPosition } from "@/components-module/data/FolderTable/context"
import { useMessageBox } from "@/modules/message-box"
import { useBrowserTabs, useDocumentTitle, usePath, useTabRoute } from "@/modules/browser"
import { useListViewContext } from "@/services/base/list-view-context"
import { SelectedState, useSelectedState } from "@/services/base/selected-state"
import { useSelectedPaneState } from "@/services/base/selected-pane-state"
import { useIllustViewController } from "@/services/base/view-controller"
import { useNavigationItem } from "@/services/base/side-nav-records"
import { installIllustListviewContext, useImageDatasetOperators } from "@/services/common/illust"
import { useFolderTableSearch } from "@/services/common/folder"
import { installation } from "@/utils/reactivity"

export const [installFolderContext, useFolderContext] = installation(function () {
    const listview = useFolderListview()

    const selector = useFolderSelectedState(listview.data)

    const paneState = useSelectedPaneState("folder")

    const operators = useOperators(listview.data, selector)

    const search = useFolderTableSearch(listview.data)

    const editableLockOn = useLocalStorage("folder/list/editable", false)

    return {paneState, listview, selector, operators, search, editableLockOn}
})

function useFolderListview() {
    const { loading, data, refresh } = useFetchReactive({
        get: client => () => client.folder.tree({}),
        eventFilter: ["entity/folder/created", "entity/folder/updated", "entity/folder/deleted", "entity/folder/pin/changed"]
    })

    return {loading, data, refresh}
}

function useFolderSelectedState(listview: Ref<FolderTreeNode[] | undefined>) {
    const selector = useSelectedState<number, FolderTreeNode>()

    watch(listview, (data, oldData) => {
        if(data && oldData) {
            //将两棵树展平成id列表进行比对
            const flattenTree = (nodes: FolderTreeNode[]): number[] => {
                const result: number[] = []
                for(const node of nodes) {
                    result.push(node.id)
                    if(node.children) {
                        result.push(...flattenTree(node.children))
                    }
                }
                return result
            }

            const newIds = new Set(flattenTree(data))
            const oldIds = new Set(flattenTree(oldData))

            //找出在新树中不存在但在旧树中存在的id
            const removedIds = [...oldIds].filter(id => !newIds.has(id))
            for(let removedId of removedIds) {
                selector.remove(removedId)
            }
        }
    })

    return selector
}

function useOperators(data: Ref<FolderTreeNode[] | undefined>, selector: SelectedState<number>) {
    const browserTabs = useBrowserTabs()
    const router = useTabRoute()
    const message = useMessageBox()

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
    const fetchBatchUpdate = usePostFetchHelper({
        request: client => client.folder.batchUpdate,
        handleErrorInRequest(e) {
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
    const fetchBatchDelete = usePostFetchHelper({
        request: client => client.folder.batchDelete,
        handleErrorInRequest(e) {
            if(e.code === "NOT_EXIST") {
                const [_, list] = e.info
                message.showOkMessage("error", "选择的节点不存在。", `父节点：${list}`)
            }else{
                return e
            }
        }
    })

    const editPosition = ref<EditPosition>()

    const openCreatePosition = () => {
        if(data.value !== undefined) {
            editPosition.value = {action: "create", parentId: null, ordinal: data.value.length}
        }
    }

    const openDetail = (folder: FolderTreeNode, at: "newTab" | "newWindow" | undefined) => {
        if(folder.type === "FOLDER") {
            if(at === "newWindow") {
                browserTabs.newWindow({routeName: "FolderDetail", path: folder.id})
            }else if(at === "newTab") {
                browserTabs.newTab({routeName: "FolderDetail", path: folder.id})
            }else{
                router.routePush({routeName: "FolderDetail", path: folder.id})
            }
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
            editPosition.value = undefined
            selector.update([res.id], res.id)
        }
    }

    const renameItem = async (folderId: number, title: string) => {
        const res = await helper.setData(folderId, {title})
        if(res !== undefined) {
            editPosition.value = undefined
            selector.update([folderId], folderId)
        }
    }

    const moveItem = async (folders: number[], targetParentId: number | null | undefined, targetOrdinal: number | undefined) => {
        if(folders.length > 1) {
            await fetchBatchUpdate({target: folders, parentId: targetParentId, ordinal: targetOrdinal})
        }else{
            await helper.setData(folders[0], {parentId: targetParentId, ordinal: targetOrdinal})
        }
    }

    const deleteItem = async (folders: number[]) => {
        if(folders.length > 1) {
            await fetchBatchDelete(folders)
        }else{
            await helper.deleteData(folders[0])
        }
    }

    return {openCreatePosition, createItem, renameItem, moveItem, deleteItem, setPinned, editPosition, openDetail}
}

export function useFolderPane() {
    const router = useTabRoute()
    const message = useMessageBox()
    const { selector } = useFolderContext()

    const path = computed<number | null>(() => selector.lastSelected.value ?? selector.selected.value[selector.selected.value.length - 1] ?? null)

    const { data, setData } = useFetchEndpoint({
        path,
        get: client => client.folder.get,
        update: client => client.folder.update,
        delete: client => client.folder.delete,
        eventFilter: c => event => (event.eventType === "entity/folder/updated" || event.eventType === "entity/folder/deleted") && event.folderId === c.path
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
            filter: ["entity/folder/images/changed"],
            operation({ event, refresh }) {
                if(event.eventType === "entity/folder/images/changed" && event.folderId === data.value?.id) {
                    refresh()
                }
            }
        }
    })

    const exampleThumbnailFiles = computed(() => exampleData.value.filter(f => f !== null).map(f => f!.filePath.sample))

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
        if(path.value !== null) {
            router.routePush({routeName: "FolderDetail", path: path.value})
        }
    }

    return {data, setTitle, exampleThumbnailFiles, openDetail}
}

export function useFolderDetailPanel() {
    const router = useTabRoute()
    const message = useMessageBox()

    const path = usePath<number>()

    const { data, deleteData } = useFetchEndpoint({
        path,
        get: client => client.folder.get,
        update: client => client.folder.update,
        delete: client => client.folder.delete,
        eventFilter: c => event => (event.eventType === "entity/folder/updated" || event.eventType === "entity/folder/deleted") && event.folderId === c.path,
        afterRetrieve(path, data) {
            if(path !== null && data === null) {
                router.routeClose()
            }
        }
    })

    const deleteItem = async () => {
        if(await message.showYesNoMessage("warn", "确定要删除此目录吗？", "此操作不可撤回。")) {
            if(await deleteData()) {
                router.routeClose()
            }
        }
    }

    const listview = useListView(path)
    const selector = useSelectedState({queryListview: listview.listview, keyOf: item => item.id})
    const paneState = useSelectedPaneState("illust")
    const listviewController = useIllustViewController()
    const operators = useImageDatasetOperators({
        listview: listview.listview, paginationData: listview.paginationData,
        listviewController, selector, embedPreview: "auto",
        dataDrop: {dropInType: "folder", path}
    })

    installIllustListviewContext({listview, selector, listviewController, folder: data})

    useNavigationItem(() => data.value !== null ? [...data.value.parentAddress, data.value.title].join("/") : null)

    useDocumentTitle(data)

    return {data, listview, selector, paneState, listviewController, operators, deleteItem}
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
        keyOf: item => item.id,
        eventFilter: {
            filter: ["entity/illust/updated", "entity/illust/deleted", "entity/folder/images/changed"],
            operation({ event, refresh, updateKey, removeKey }) {
                if(event.eventType === "entity/illust/updated" && event.listUpdated) {
                    updateKey(event.illustId)
                }else if(event.eventType === "entity/illust/deleted") {
                    removeKey(event.illustId)
                }else if(event.eventType === "entity/folder/images/changed" && event.folderId === path.value) {
                    refresh()
                }
            },
            request: client => async items => mapResponse(await client.illust.findByIds(items.map(i => i.id)), r => r.map(i => i !== null ? i : undefined))
        }
    })
}
