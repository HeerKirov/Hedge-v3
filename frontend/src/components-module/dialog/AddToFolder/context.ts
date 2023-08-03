import { ref, Ref } from "vue"
import { useFetchHelper, useFetchReactive, usePostFetchHelper, usePostPathFetchHelper } from "@/functions/fetch"
import { useMessageBox } from "@/modules/message-box"
import { computedAsync } from "@/utils/reactivity"
import { Push } from "../context"

export interface AddToFolder {
    /**
     * 打开一个对话框，选择要把当前的images列表添加到哪个folders中，并执行添加。
     * 如果这些项存在重复，则会进行重复项确认。
     */
    addToFolder(illustIds: number[], onSuccess?: () => void): void
}

export interface AddToFolderProps {
    illustIds: number[]
    resolve?(): void
}

export function useAddToFolder(push: Push): AddToFolder {
    return {
        addToFolder(illustIds: number[], onSuccess?: () => void) {
            push({
                type: "addToFolder",
                props: {illustIds, resolve: onSuccess}
            })
        }
    }
}

export function useAddToFolderContext(illustIds: Ref<number[]>, resolve: () => void) {
    const message = useMessageBox()
    const fetchFolderSituation = useFetchHelper(client => client.illustUtil.getFolderSituation)
    const fetchPushHistory = usePostFetchHelper(client => client.searchUtil.history.push)
    const fetchFolderImagesPartialUpdate = usePostPathFetchHelper({
        request: client => client.folder.images.partialUpdate,
        handleErrorInRequest(e) {
            if(e.code === "REJECT") {
                message.showOkMessage("prompt", "不能选择节点作为添加对象。")
            }
        }
    })

    const { data: folderTree } = useFetchReactive({
        get: client => () => client.folder.tree({}),
        eventFilter: ["entity/folder/created", "entity/folder/updated", "entity/folder/deleted", "entity/folder/pin/changed"]
    })

    const { data: recentFolders } = useFetchReactive({
        get: client => client.searchUtil.history.folders
    })

    const tabType = ref<"recent" | "all">("recent")

    const selectedId = ref<number | null>(null)

    const checkExists = computedAsync(null, async () => {
        if(selectedId.value !== null) {
            const res = await fetchFolderSituation({folderId: selectedId.value, illustIds: illustIds.value})
            if(res !== undefined) {
                const duplicates = res.filter(d => d.ordinal !== null).map(d => ({id: d.id, filePath: d.filePath, ordinal: d.ordinal!}))
                if(duplicates.length > 0) {
                    return {
                        duplicates,
                        moveResolution: illustIds.value,
                        ignoreResolution: res.filter(i => i.ordinal === null).map(i => i.id)
                    }
                }
            }
        }
        return null
    })

    const save = async (folderId: number, images: number[]) => {
        if(images.length <= 0) {
            resolve()
            fetchPushHistory({type: "FOLDER", id: folderId}).finally()
        }else{
            const res = await fetchFolderImagesPartialUpdate(folderId, {action: "ADD", images})
            if(res) {
                resolve()
                fetchPushHistory({type: "FOLDER", id: folderId}).finally()
            }
        }
    }

    const submit = async () => {
        if(selectedId.value !== null) {
            await save(selectedId.value, illustIds.value)
        }
    }

    const chooseMove = async () => {
        if(selectedId.value !== null && checkExists.value !== null) {
            await save(selectedId.value, checkExists.value.moveResolution)
        }
    }

    const chooseIgnore = async () => {
        if(selectedId.value !== null && checkExists.value !== null) {
            await save(selectedId.value, checkExists.value.ignoreResolution)
        }
    }

    return {tabType, folderTree, recentFolders, selectedId, checkExists, submit, chooseMove, chooseIgnore}
}
