import { Ref, computed, ref } from "vue"
import { flatResponse } from "@/functions/http-client"
import { ImportRecord, ImportQueryFilter } from "@/functions/http-client/api/import"
import { QueryListview, useFetchEndpoint, useFetchHelper, useFetchReactive, usePostFetchHelper } from "@/functions/fetch"
import { useListViewContext } from "@/services/base/list-view-context"
import { SelectedState, useSelectedState } from "@/services/base/selected-state"
import { useSelectedPaneState } from "@/services/base/selected-pane-state"
import { ImportImageViewController, useImportImageViewController } from "@/services/base/view-controller"
import { useSettingImport, useSettingSite } from "@/services/setting"
import { usePreviewService } from "@/components-module/preview"
import { useDocumentTitle, useTabRoute } from "@/modules/browser"
import { useToast } from "@/modules/toast"
import { useMessageBox } from "@/modules/message-box"
import { useDroppingFileListener } from "@/modules/drag"
import { dialogManager } from "@/modules/dialog"
import { installation } from "@/utils/reactivity"

export const [installImportContext, useImportContext] = installation(function () {
    const importService = useImportService()
    const watcher = useImportFileWatcher()
    const listview = useListView()
    const selector = useSelectedState({queryListview: listview.listview, keyOf: item => item.id})
    const paneState = useSelectedPaneState("import-image")
    const listviewController = useImportImageViewController()
    const operators = useOperators(listview.listview, listview.queryFilter, selector, listviewController, importService.addFiles)

    useDroppingFileListener(importService.addFiles)
    useSettingSite()
    useDocumentTitle(() => operators.historyMode.value ? "导入历史" : "导入")

    return {paneState, watcher, importService, listview, selector, listviewController, operators}
})

function useImportService() {
    const toast = useToast()
    const fetch = useFetchHelper(client => client.import.import)

    const progress = ref({value: 0, max: 0})
    const progressing = computed(() => progress.value.max > 0)

    const addFiles = async (files: string[]) => {
        progress.value.max += files.length

        for (const filepath of files) {
            await fetch({filepath}, e => {
                if(e.code === "FILE_NOT_FOUND") {
                    toast.toast("错误", "danger", `文件${filepath}不存在。`)
                }else if(e.code === "ILLEGAL_FILE_EXTENSION") {
                    toast.toast("错误", "danger", `文件${filepath}的类型不适用。`)
                }else{
                    toast.handleException(e)
                }
            })
            progress.value.value += 1
        }

        if(progress.value.value >= progress.value.max) {
            progress.value.max = 0
            progress.value.value = 0
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
    return useListViewContext({
        defaultFilter: <ImportQueryFilter>{order: "-importTime", deleted: false},
        request: client => (offset, limit, filter) => client.import.list({offset, limit, ...filter}),
        keyOf: item => item.id,
        eventFilter: {
            filter: ["entity/import/created", "entity/import/updated", "entity/import/deleted", "entity/illust/updated", "entity/illust/deleted"],
            operation({ event, refresh, updateKey, updateOne, removeKey }) {
                if(event.eventType === "entity/import/created") {
                    refresh()
                }else if(event.eventType === "entity/import/updated") {
                    updateKey(event.importId)
                }else if((event.eventType === "entity/illust/deleted" && event.illustType === "IMAGE") || (event.eventType === "entity/illust/updated" && event.illustType === "IMAGE" && event.listUpdated)) {
                    updateOne(i => i.illust?.id === event.illustId)
                }else if(event.eventType === "entity/import/deleted") {
                    removeKey(event.importId)
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.import.get(a.id))))
        }
    })
}

function useOperators(listview: QueryListview<ImportRecord, number>, queryFilter: Ref<ImportQueryFilter>, selector: SelectedState<number>, listviewController: ImportImageViewController, addFiles: (f: string[]) => void) {
    const toast = useToast()
    const message = useMessageBox()
    const preview = usePreviewService()
    const batchFetch = useFetchHelper(client => client.import.batch)

    const historyMode = computed({
        get: () => queryFilter.value.deleted ?? false,
        set: value => queryFilter.value.deleted = value
    })

    const getEffectedItems = (id: number): number[] => {
        return selector.selected.value.includes(id) ? selector.selected.value : [id]
    }

    const deleteItem = async (id: number) => {
        if(selector.selected.value.length === 0 || !selector.selected.value.includes(id)) {
            if(await message.showYesNoMessage("warn", "确定要删除此记录吗？", historyMode.value ? "历史记录将被彻底删除。" : "已被删除的记录短期内可在历史记录中查看。相关的图库项目不会被删除。")) {
                await batchFetch({target: [id], delete: !historyMode.value, deleteDeleted: historyMode.value})
            }
        }else{
            const items = getEffectedItems(id)
            if(await message.showYesNoMessage("warn", `确定要删除${items.length}个记录吗？`, historyMode.value ? "历史记录将被彻底删除。" : "已被删除的记录短期内可在历史记录中查看。相关的图库项目不会被删除。")) {
                await batchFetch({target: items, delete: !historyMode.value, deleteDeleted: historyMode.value})
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

    const openImagePreview = (importImage?: ImportRecord) => {
        if(importImage !== undefined) {
            //如果指定项已选中，那么将最后选中项重新指定为指定项；如果未选中，那么将单独选中此项
            if(selector.selected.value.includes(importImage.id)) {
                selector.update(selector.selected.value, importImage.id)
            }else{
                selector.update([importImage.id], importImage.id)
            }
        }
        if(selector.selected.value.length > 0) preview.show({
            preview: "image", 
            type: "listview", 
            listview: listview,
            columnNum: listviewController.columnNum,
            viewMode: listviewController.viewMode,
            selected: selector.selected,
            lastSelected: selector.lastSelected,
            updateSelect: selector.update
        })
    }

    const analyseSource = async (importImage: ImportRecord) => {
        const res = await batchFetch({target: getEffectedItems(importImage.id), analyseSource: true})
        if(res !== undefined) toast.toast("已重新生成", "success", "已从导入记录重新生成项目的来源属性。")
    }

    const analyseTime = async (importImage: ImportRecord) => {
        const res = await batchFetch({target: getEffectedItems(importImage.id), analyseTime: true})
        if(res !== undefined) toast.toast("已重新生成", "success", "已从导入记录重新生成项目的时间属性。")
    }

    const retry = (importImage: ImportRecord) => batchFetch({target: getEffectedItems(importImage.id), retry: true})

    const clear = async () => {
        if(await message.showYesNoMessage("warn", "确定要清除所有记录吗？", historyMode.value ? "历史记录将被彻底删除。" : "已被删除的记录短期内可在历史记录中查看。相关的图库项目不会被删除。")) {
            batchFetch({clearCompleted: !historyMode.value, deleteDeleted: historyMode.value}).finally()
        }
    }

    return {historyMode, openDialog, deleteItem, openImagePreview, analyseSource, analyseTime, retry, clear}
}

export function useImportDetailPane() {
    const message = useMessageBox()
    const preview = usePreviewService()
    const router = useTabRoute()
    const { listview, listviewController, selector } = useImportContext()

    const path = computed(() => selector.lastSelected.value ?? selector.selected.value[selector.selected.value.length - 1] ?? null)

    const { data } = useFetchEndpoint({
        path,
        get: client => client.import.get,
        eventFilter: c => event => ((event.eventType === "entity/import/updated" || event.eventType === "entity/import/deleted") && event.importId === c.path) || ((event.eventType === "entity/illust/deleted" || event.eventType === "entity/illust/updated") && event.illustType === "IMAGE" && event.illustId === c.data?.illust?.id)
    })

    const showStatusInfoMessage = (type: "thumbnailError" | "fingerprintError" | "sourceAnalyseError" | "sourceAnalyseNone") => {
        const info = type === "thumbnailError" ? "缩略图生成失败"
            : type === "fingerprintError" ? "指纹生成失败"
            : type === "sourceAnalyseError" ? "来源数据解析失败"
            : "无来源数据"
        const msg = type === "sourceAnalyseNone" ? "已在偏好设置中开启\"阻止无来源的导入\"选项，因此无法解析获得来源数据的项会被阻止。"
            : data.value?.statusInfo?.messages?.join("\n") ?? ""
        message.showOkMessage("info", info, msg)
    }

    const gotoIllust = () => {
        if(data.value?.illust) {
            router.routePush({routeName: "PartitionDetail", path: data.value.illust.partitionTime, initializer: {locateId: data.value.illust.id}})
        }
    }

    const openImagePreview = () => {
        if(selector.selected.value.length > 0) preview.show({
            preview: "image", 
            type: "listview", 
            listview: listview.listview,
            columnNum: listviewController.columnNum,
            viewMode: listviewController.viewMode,
            selected: selector.selected,
            lastSelected: selector.lastSelected,
            updateSelect: selector.update
        })
    }

    return {path, data, selector, gotoIllust, showStatusInfoMessage, openImagePreview}
}
