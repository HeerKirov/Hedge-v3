import { computed, ref, Ref } from "vue"
import { flatResponse } from "@/functions/http-client"
import { ImportQueryFilter } from "@/functions/http-client/api/import"
import { useFetchHelper, useRetrieveHelper } from "@/functions/fetch"
import { useLocalStorage } from "@/functions/app"
import { useListViewContext } from "@/services/base/list-view-context"
import { useSelectedState } from "@/services/base/selected-state"
import { useSelectedPaneState } from "@/services/base/selected-pane-state"
import { useToast } from "@/modules/toast"
import { useMessageBox } from "@/modules/message-box"
import { dialogManager } from "@/modules/dialog"
import { installVirtualViewNavigation } from "@/components/data"
import { installation, toRef } from "@/utils/reactivity"
import { strings } from "@/utils/primitives"

export const [installImportContext, useImportContext] = installation(function () {
    const importService = useImportService()
    const listview = useListView()
    const selector = useSelectedState({queryListview: listview.listview, keyOf: item => item.id})
    const paneState = useSelectedPaneState("import-image", selector)
    const listviewController = useListViewController()
    const operators = useOperators(listview.anyData, importService.addFiles)

    installVirtualViewNavigation()

    return {paneState, importService, listview, selector, listviewController, operators}
})

function useImportService() {
    const toast = useToast()
    const fetch = useFetchHelper(client => client.import.import)

    const progress = ref({value: 0, max: 0})
    const progressing = computed(() => progress.value.max > 0)
    const warningList: {id: number, filepath: string, warningMessage: string[]}[] = []

    const addFiles = async (files: string[]) => {
        progress.value.max += files.length

        for await (const filepath of files) {
            const res = await fetch({filepath}, e => {
                if(e.code === "FILE_NOT_FOUND") {
                    toast.toast("错误", "danger", `文件${filepath}不存在。`)
                }else if(e.code === "ILLEGAL_FILE_EXTENSION") {
                    toast.toast("错误", "danger", `文件${filepath}的类型不适用。`)
                }else{
                    toast.handleException(e)
                }
            })
            if(res !== undefined) {
                const { id, warnings } = res
                if(warnings.length) {
                    warningList.push({id, filepath, warningMessage: warnings.flatMap(i => i.message ? [i.message] : [])})
                }
            }
            progress.value.value += 1
        }

        if(progress.value.value >= progress.value.max) {
            progress.value.max = 0
            progress.value.value = 0

            if(warningList.length) {
                const message = warningList.length > 3
                    ? `超过${warningList.length}个文件来源信息分析失败。可能是因为正则表达式内容错误。`
                    : `文件${warningList.map(({ filepath }) => strings.lastPathOf(filepath)).join(", ")}的来源信息分析失败：\n${warningList.flatMap(({ warningMessage }) => warningMessage).join("\n")}`
                toast.toast("来源信息分析失败", "warning", message)
                warningList.splice(0, warningList.length)
            }
        }
    }

    return {progress, progressing, addFiles}
}

function useListView() {
    const list = useListViewContext({
        defaultFilter: <ImportQueryFilter>{order: "-fileUpdateTime"},
        request: client => (offset, limit, filter) => client.import.list({offset, limit, ...filter}),
        eventFilter: {
            filter: ["entity/import/created", "entity/import/updated", "entity/import/deleted", "entity/import/saved"],
            operation({ event, refresh, update, remove }) {
                if(event.eventType === "entity/import/created" || event.eventType === "entity/import/saved") {
                    refresh()
                }else if(event.eventType === "entity/import/updated") {
                    update(i => i.id === event.importId)
                }else if(event.eventType === "entity/import/deleted") {
                    remove(i => i.id === event.importId)
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.import.get(a.id))))
        }
    })

    const anyData = computed(() => list.paginationData.data.metrics.total != undefined && list.paginationData.data.metrics.total > 0)

    return {...list, anyData}
}

function useListViewController() {
    const storage = useLocalStorage<{
        fitType: "cover" | "contain", columnNum: number, viewMode: "row" | "grid"
    }>("import-image/list/view-controller", {
        fitType: "cover", columnNum: 8, viewMode: "grid"
    })

    return {
        fitType: toRef(storage, "fitType"),
        columnNum: toRef(storage, "columnNum"),
        viewMode: toRef(storage, "viewMode")
    }
}

function useOperators(anyData: Ref<boolean>, addFiles: (f: string[]) => void) {
    const toast = useToast()
    const message = useMessageBox()
    const saveFetch = useFetchHelper(client => client.import.save)
    const retrieveHelper = useRetrieveHelper({
        delete: client => client.import.delete
    })

    const deleteItem = async (id: number) => {
        //TODO import列表的删除只针对了选中项。需要像illust列表那样扩展至所有选择项。
        if(await message.showYesNoMessage("warn", "确定要删除此项吗？", "此操作不可撤回。")) {
            await retrieveHelper.deleteData(id)
        }
    }

    const save = async () => {
        if(anyData.value) {
            const res = await saveFetch(undefined, e => {
                if(e.code === "FILE_NOT_READY") {
                    toast.toast("未准备完毕", "warning", "仍有导入项目未准备完毕。请等待。")
                }else{
                    toast.handleException(e)
                }
            })
            if(res !== undefined) {
                const { total } = res
                toast.toast("已导入项目", "success", `${total}个项目已导入图库。`)
            }
        }
    }

    const openDialog = async () => {
        const files = await dialogManager.openDialog({
            title: "选择文件",
            filters: [
                {
                    name: "支持的文件格式(*.jpeg, *.jpg, *.png, *.gif, *.mp4, *.webm, *.ogv)",
                    extensions: ["jpeg", "jpg", "png", "gif", "mp4", "webm", "ogv"]
                }
            ],
            properties: ["openFile", "multiSelections", "createDirectory"]
        })

        if(files) {
            addFiles(files)
        }
    }

    return {save, openDialog, deleteItem}
}
