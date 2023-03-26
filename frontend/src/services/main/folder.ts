import { ref } from "vue"
import { FolderCreateForm, FolderTreeNode } from "@/functions/http-client/api/folder"
import {
    useFetchHelper,
    useFetchReactive,
    usePostFetchHelper,
    usePostPathFetchHelper,
    useRetrieveHelper
} from "@/functions/fetch"
import { useLocalStorage } from "@/functions/app"
import { useRouterNavigator, useRouterQueryNumber } from "@/modules/router"
import { DetailViewState, useDetailViewState, useRouterViewState } from "@/services/base/detail-view-state"
import { useMessageBox } from "@/modules/message-box"
import { installation } from "@/utils/reactivity"

export const [installFolderContext, useFolderContext] = installation(function () {
    const viewState = useRouterViewState<number>(useRouterQueryNumber("MainAuthor", "detail"))

    const paneState = useDetailViewState<number>()

    const listview = useFolderListview()

    const operators = useOperators(paneState, viewState)

    const editableLockOn = useLocalStorage("folder/list/editable", false)

    return {viewState, paneState, listview, operators, editableLockOn}
})

function useFolderListview() {
    const { loading, data, refresh } = useFetchReactive({
        get: client => () => client.folder.tree({}),
        eventFilter: ["entity/folder/created", "entity/folder/updated", "entity/folder/deleted", "entity/folder-pin/changed"]
    })

    return {loading, data, refresh}
}

function useOperators(paneState: DetailViewState<number>, viewState: DetailViewState<number>) {
    const message = useMessageBox()
    const navigator = useRouterNavigator()

    const helper = useRetrieveHelper({
        update: client => client.folder.update,
        delete: client => client.folder.delete,
        handleErrorInUpdate(e) {
            if(e.code === "ALREADY_EXISTS") {
                message.showOkMessage("prompt", "该名称已存在。")
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
                message.showOkMessage("prompt", "该名称已存在。")
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

    const createPosition = ref<{parentId: number, ordinal: number}>()

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

    return {createItem, moveItem, deleteItem, setPinned, createPosition, openDetail}
}
