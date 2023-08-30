import { computed, reactive, ref, Ref } from "vue"
import { installVirtualViewNavigation } from "@/components/data"
import { flatResponse } from "@/functions/http-client"
import { Tagme } from "@/functions/http-client/api/illust"
import { ImportQueryFilter } from "@/functions/http-client/api/import"
import { OrderTimeType } from "@/functions/http-client/api/setting"
import { SourceDataPath } from "@/functions/http-client/api/all"
import { useFetchEndpoint, useFetchHelper, useFetchReactive, usePostFetchHelper, useRetrieveHelper } from "@/functions/fetch"
import { useListViewContext } from "@/services/base/list-view-context"
import { SelectedState, useSelectedState } from "@/services/base/selected-state"
import { useSelectedPaneState } from "@/services/base/selected-pane-state"
import { useImportImageViewController } from "@/services/base/view-controller"
import { useSettingImport, useSettingSite } from "@/services/setting"
import { usePreviewService } from "@/components-module/preview"
import { useToast } from "@/modules/toast"
import { useMessageBox } from "@/modules/message-box"
import { useDroppingFileListener } from "@/modules/drag"
import { dialogManager } from "@/modules/dialog"
import { installation } from "@/utils/reactivity"
import { objects, strings } from "@/utils/primitives"
import { date, LocalDate, LocalDateTime } from "@/utils/datetime"

export const [installImportContext, useImportContext] = installation(function () {
    const importService = useImportService()
    const watcher = useImportFileWatcher()
    const listview = useListView()
    const selector = useSelectedState({queryListview: listview.listview, keyOf: item => item.id})
    const paneState = useSelectedPaneState("import-image", selector)
    const listviewController = useImportImageViewController()
    const operators = useOperators(selector, listview.anyData, importService.addFiles)

    useDroppingFileListener(importService.addFiles)
    installVirtualViewNavigation()
    useSettingSite()

    return {paneState, watcher, importService, listview, selector, listviewController, operators}
})

function useImportService() {
    const toast = useToast()
    const fetch = useFetchHelper(client => client.import.import)

    const progress = ref({value: 0, max: 0})
    const progressing = computed(() => progress.value.max > 0)
    const warningList: {id: number, filepath: string, warningMessage: string[]}[] = []

    const addFiles = async (files: string[]) => {
        progress.value.max += files.length

        for (const filepath of files) {
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

function useImportFileWatcher() {
    const fetch = usePostFetchHelper(client => client.import.watcher.update)

    const { data: state } = useFetchReactive({
        get: client => client.import.watcher.get,
        eventFilter: ["app/path-watcher/status-changed"]
    })

    const { data: importSettingData } = useSettingImport()

    const paths = computed(() => importSettingData.value?.watchPaths ?? [])

    const setState = async (opened: boolean) => await fetch({isOpen: opened})

    return {state, paths, setState}
}

function useListView() {
    const list = useListViewContext({
        defaultFilter: <ImportQueryFilter>{order: "-fileUpdateTime"},
        request: client => (offset, limit, filter) => client.import.list({offset, limit, ...filter}),
        eventFilter: {
            filter: ["entity/import/created", "entity/import/updated", "entity/import/deleted", "entity/import/saved"],
            operation({ event, refresh, updateOne, removeOne }) {
                if(event.eventType === "entity/import/created") {
                    refresh()
                }else if(event.eventType === "entity/import/updated") {
                    updateOne(i => i.id === event.importId)
                }else if(event.eventType === "entity/import/deleted") {
                    removeOne(i => i.id === event.importId)
                }else if(event.eventType === "entity/import/saved") {
                    for(const id of Object.keys(event.importIdToImageIds).map(i => parseInt(i))) {
                        removeOne(i => i.id === id)
                    }
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.import.get(a.id))))
        }
    })

    const anyData = computed(() => list.paginationData.data.metrics.total != undefined && list.paginationData.data.metrics.total > 0)

    return {...list, anyData}
}

function useOperators(selector: SelectedState<number>, anyData: Ref<boolean>, addFiles: (f: string[]) => void) {
    const toast = useToast()
    const message = useMessageBox()
    const saveFetch = useFetchHelper(client => client.import.save)
    const retrieveHelper = useRetrieveHelper({
        delete: client => client.import.delete
    })

    const getEffectedItems = (id: number): number[] => {
        return selector.selected.value.includes(id) ? selector.selected.value : [id]
    }

    const deleteItem = async (id: number) => {
        if(selector.selected.value.length === 0 || !selector.selected.value.includes(id)) {
            if(await message.showYesNoMessage("warn", "确定要删除此项吗？", "此操作不可撤回。")) {
                await retrieveHelper.deleteData(id)
            }
        }else{
            const items = getEffectedItems(id)
            if(await message.showYesNoMessage("warn", `确定要删除${items.length}个已选择项吗？`, "此操作不可撤回。")) {
                for (const id of items) {
                    retrieveHelper.deleteData(id).finally()
                }
            }
        }
    }

    const save = async () => {
        if(anyData.value) {
            const target = selector.selected.value.length > 0 ? selector.selected.value : undefined
            const res = await saveFetch({target}, e => {
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

export function useImportDetailPaneSingle(path: Ref<number | null>) {
    const preview = usePreviewService()
    const message = useMessageBox()
    const { listview, listviewController, selector } = useImportContext()

    const { data, setData } = useFetchEndpoint({
        path,
        get: client => client.import.get,
        update: client => client.import.update,
        eventFilter: c => event => (event.eventType === "entity/import/updated" || event.eventType === "entity/import/deleted") && event.importId === c.path
    })

    const setTagme = async (tagme: Tagme[]) => {
        return objects.deepEquals(tagme, data.value?.tagme) || await setData({tagme})
    }

    const setSourceInfo = async (source: SourceDataPath | null) => {
        return objects.deepEquals(data.value?.source, source) || await setData({source}, e => {
            if(e.code === "NOT_EXIST") {
                message.showOkMessage("error", `来源${source?.sourceSite}不存在。`)
            }else if(e.code === "PARAM_ERROR") {
                const target = e.info === "sourceId" ? "来源ID" : e.info === "sourcePart" ? "分页" : e.info === "sourcePartName" ? "分页页名" : e.info
                message.showOkMessage("error", `${target}的值内容错误。`, "ID只能是自然数。")
            }else if(e.code === "PARAM_REQUIRED") {
                const target = e.info === "sourceId" ? "来源ID" : e.info === "sourcePart" ? "分页" : e.info === "sourcePartName" ? "分页页名": e.info
                message.showOkMessage("error", `${target}属性缺失。`)
            }else if(e.code === "PARAM_NOT_REQUIRED") {
                if(e.info === "sourcePart") {
                    message.showOkMessage("error", `分页属性不需要填写，因为选择的来源类型不支持分页。`)
                }else if(e.info === "sourcePartName") {
                    message.showOkMessage("error", `分页页名属性不需要填写，因为选择的来源类型不支持分页页名。`)
                }else if(e.info === "sourceId/sourcePart/sourcePartName") {
                    message.showOkMessage("error", `来源ID/分页属性不需要填写，因为未指定来源类型。`)
                }else{
                    message.showOkMessage("error", `${e.info}属性不需要填写。`)
                }
            }else{
                return e
            }
        })
    }

    const setPartitionTime = async (partitionTime: LocalDateTime) => {
        return partitionTime.timestamp === data.value?.partitionTime?.timestamp || await setData({partitionTime})
    }

    const setCreateTime = async (createTime: LocalDateTime) => {
        return createTime.timestamp === data.value?.createTime?.timestamp || await setData({createTime})
    }

    const setOrderTime = async (orderTime: LocalDateTime) => {
        return orderTime.timestamp === data.value?.orderTime?.timestamp || await setData({orderTime})
    }

    const clearAllPreferences = async () => {
        if(await message.showYesNoMessage("confirm", "确认要清除所有预设吗？")) {
            await setData({preference: {cloneImage: null}, collectionId: null, bookIds: []})
        }
    }

    const clearAllSourcePreferences = async () => {
        if(await message.showYesNoMessage("confirm", "确认要清除所有来源数据预设吗？")) {
            await setData({sourcePreference: null})
        }
    }

    const openImagePreview = () => {
        preview.show({
            preview: "image", 
            type: "listview", 
            listview: listview.listview,
            paginationData: listview.paginationData.data,
            columnNum: listviewController.columnNum,
            viewMode: listviewController.viewMode,
            selected: selector.selected,
            lastSelected: selector.lastSelected,
            updateSelect: selector.update
        })
    }

    return {data, setTagme, setSourceInfo, setPartitionTime, setCreateTime, setOrderTime, clearAllPreferences, clearAllSourcePreferences, openImagePreview}
}

export function useImportDetailPaneMultiple(selected: Ref<number[]>, latest: Ref<number | null>) {
    const toast = useToast()
    const preview = usePreviewService()
    const { listview, listviewController, selector } = useImportContext()

    const batchFetch = useFetchHelper(httpClient => httpClient.import.batchUpdate)

    const { data } = useFetchEndpoint({
        path: latest,
        get: client => client.import.get,
        eventFilter: c => event => (event.eventType === "entity/import/updated" || event.eventType === "entity/import/deleted") && event.importId === c.path
    })

    const actives = reactive({
        tagme: false,
        setCreatedTimeBy: false,
        setOrderTimeBy: false,
        partitionTime: false
    })

    const anyActive = computed(() => actives.tagme || actives.setOrderTimeBy || actives.setOrderTimeBy || actives.partitionTime || form.analyseSource)

    const form = reactive<{
        tagme: Tagme[]
        setCreatedTimeBy: OrderTimeType
        setOrderTimeBy: OrderTimeType
        partitionTime: LocalDate
        analyseSource: boolean
    }>({
        tagme: [],
        setCreatedTimeBy: "UPDATE_TIME",
        setOrderTimeBy: "UPDATE_TIME",
        partitionTime: date.now(),
        analyseSource: false
    })

    const openImagePreview = () => {
        preview.show({
            preview: "image", 
            type: "listview", 
            listview: listview.listview,
            paginationData: listview.paginationData.data,
            columnNum: listviewController.columnNum,
            viewMode: listviewController.viewMode,
            selected: selector.selected,
            lastSelected: selector.lastSelected,
            updateSelect: selector.update
        })
    }

    const submit = async () => {
        if(anyActive.value) {
            const res = await batchFetch({
                target: selected.value,
                tagme: actives.tagme ? form.tagme : undefined,
                setCreateTimeBy: actives.setCreatedTimeBy ? form.setCreatedTimeBy : undefined,
                setOrderTimeBy: actives.setOrderTimeBy ? form.setOrderTimeBy : undefined,
                partitionTime: actives.partitionTime ? form.partitionTime : undefined,
                analyseSource: form.analyseSource
            }, toast.handleException)
            if(res) {
                if(res.length) {
                    if(res.length > 3) {
                        toast.toast("来源信息分析失败", "warning", `超过${res.length}个文件的来源信息分析失败，可能是因为正则表达式内容错误。`)
                    }else{
                        toast.toast("来源信息分析失败", "warning", "存在文件的来源信息分析失败，可能是因为正则表达式内容错误。")
                    }
                }else{
                    toast.toast("批量编辑完成", "info", "已完成所选项目的信息批量编辑。")
                }
                clear()
            }
        }
    }

    const clear = () => {
        actives.tagme = false
        actives.setCreatedTimeBy = false
        actives.setOrderTimeBy = false
        actives.partitionTime = false
    }

    return {data, actives, anyActive, form, submit, clear, openImagePreview}
}
