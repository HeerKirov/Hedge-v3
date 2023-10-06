import { computed, reactive, ref, Ref, watch } from "vue"
import { installVirtualViewNavigation } from "@/components/data"
import { flatResponse } from "@/functions/http-client"
import { Tagme } from "@/functions/http-client/api/illust"
import { ImportImage, ImportQueryFilter } from "@/functions/http-client/api/import"
import { OrderTimeType } from "@/functions/http-client/api/setting"
import { NullableFilePath, SourceDataPath } from "@/functions/http-client/api/all"
import { QueryInstance, QueryListview, useFetchEndpoint, useFetchHelper, useFetchReactive, usePostFetchHelper, useRetrieveHelper } from "@/functions/fetch"
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
import { installation, toRef } from "@/utils/reactivity"
import { objects, strings } from "@/utils/primitives"
import { date, LocalDate, LocalDateTime } from "@/utils/datetime"
import { useLocalStorage } from "@/functions/app"
import { useListeningEvent } from "@/utils/emitter"
import { useInterceptedKey } from "@/modules/keyboard"

export const [installImportContext, useImportContext] = installation(function () {
    const importService = useImportService()
    const watcher = useImportFileWatcher()
    const listview = useListView()
    const selector = useSelectedState({queryListview: listview.listview, keyOf: item => item.id})
    const paneState = useSelectedPaneState("import-image")
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
                    const keys = Object.keys(event.importIdToImageIds)
                    //tips: 已内置阈值刷新功能，不再需要外部实现
                    for(const id of keys.map(i => parseInt(i))) {
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

export function useImportDetailPane() {
    const preview = usePreviewService()
    const { listview, listviewController, selector } = useImportContext()

    const storage = useLocalStorage<{multiple: boolean}>("import/list/pane", () => ({multiple: true}), true)

    const tabType = computed({
        get: () => selector.selected.value.length > 1 && storage.value.multiple ? "action" : "info",
        set: (value) => {
            if(selector.selected.value.length > 1) {
                if(value !== "action") {
                    storage.value.multiple = false
                }else if(!storage.value.multiple) {
                    storage.value.multiple = true
                }
            }
        }
    })

    const path = computed(() => selector.lastSelected.value ?? selector.selected.value[selector.selected.value.length - 1] ?? null)

    const detail = useImportDetailPaneId(path, listview.listview, listview.paginationData.proxy)

    useInterceptedKey(["Meta+Digit1", "Meta+Digit2"], e => {
        if(e.key === "Digit1") tabType.value = "info"
        else if(e.key === "Digit2") tabType.value = "action"
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

    return {tabType, detail, selector, openImagePreview}
}

function useImportDetailPaneId(path: Ref<number | null>, listview: QueryListview<ImportImage>, instance: QueryInstance<ImportImage>) {
    const detail = ref<{id: number, filename: string | null, filePath: NullableFilePath} | null>(null)

    const fetch = useFetchHelper(client => client.import.get)

    watch(path, async path => {
        if(path !== null) {
            const idx = instance.syncOperations.find(i => i.id === path)
            if(idx !== undefined) {
                const item = instance.syncOperations.retrieve(idx)!
                detail.value = {id: item.id, filename: item.originFileName, filePath: item.filePath}
            }else{
                const res = await fetch(path)
                detail.value = res !== undefined ? {id: res.id, filename: res.originFileName, filePath: res.filePath} : null
            }
        }else{
            detail.value = null
        }
    }, {immediate: true})

    useListeningEvent(listview.modifiedEvent, async e => {
        if(path.value !== null) {
            if(e.type === "FILTER_UPDATED" || e.type === "REFRESH") {
                const idx = instance.syncOperations.find(i => i.id === path.value)
                if(idx !== undefined) {
                    const item = instance.syncOperations.retrieve(idx)!
                    detail.value = {id: item.id, filename: item.originFileName, filePath: item.filePath}
                }else{
                    const res = await fetch(path.value)
                    detail.value = res !== undefined ? {id: res.id, filename: res.originFileName, filePath: res.filePath} : null
                }
            }else if(e.type === "MODIFY" && e.value.id === path.value) {
                detail.value = {id: e.value.id, filename: e.value.originFileName, filePath: e.value.filePath}
            }else if(e.type === "REMOVE" && e.oldValue.id === path.value) {
                detail.value = null
            }
        }
    })

    return detail
}

export function useSideBarDetailInfo(path: Ref<number | null>) {
    const message = useMessageBox()

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
                    message.showOkMessage("error", `分页属性不需要填写，因为选择的来源站点不支持分页。`)
                }else if(e.info === "sourcePartName") {
                    message.showOkMessage("error", `分页页名属性不需要填写，因为选择的来源站点不支持分页页名。`)
                }else if(e.info === "sourceId/sourcePart/sourcePartName") {
                    message.showOkMessage("error", `来源ID/分页属性不需要填写，因为未指定来源站点。`)
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

    return {data, setTagme, setSourceInfo, setPartitionTime, setCreateTime, setOrderTime, clearAllPreferences, clearAllSourcePreferences}
}

export function useSideBarAction(selected: Ref<number[]>) {
    const toast = useToast()

    const batchFetch = useFetchHelper({
        request: httpClient => httpClient.import.batchUpdate,
        afterRequest: () => toast.toast("批量编辑完成", "info", "已完成所选项目的更改。")
    })

    const actives = reactive({partitionTime: false})

    const form = reactive<{tagme: Tagme[], partitionTime: LocalDate}>({tagme: [], partitionTime: date.now()})

    watch(selected, () => {
        if(actives.partitionTime) actives.partitionTime = false
        if(form.tagme.length) form.tagme = []
    })

    const setTagme = async (tagme: Tagme[]): Promise<boolean> => {
        if(tagme !== form.tagme) {
            form.tagme = tagme
            return await batchFetch({target: selected.value, tagme}) !== undefined
        }
        return true
    }

    const submitPartitionTime = async () => {
        if(actives.partitionTime && await batchFetch({target: selected.value, partitionTime: form.partitionTime})) {
            actives.partitionTime = false
        }
    }

    const analyseSource = async () => {
        const res = await batchFetch({target: selected.value, analyseSource: true})
        if(res && res.length) {
            if(res.length > 3) {
                toast.toast("来源信息分析失败", "warning", `超过${res.length}个文件的来源信息分析失败，可能是因为正则表达式内容错误。`)
            }else{
                toast.toast("来源信息分析失败", "warning", "存在文件的来源信息分析失败，可能是因为正则表达式内容错误。")
            }
        }
    }

    const createTimeAction = (action: OrderTimeType) => {
        batchFetch({target: selected.value, setCreateTimeBy: action})
    }

    const orderTimeAction = (action: OrderTimeType) => {
        batchFetch({target: selected.value, setOrderTimeBy: action})
    }

    return {actives, form, setTagme, submitPartitionTime, analyseSource, createTimeAction, orderTimeAction}
}
