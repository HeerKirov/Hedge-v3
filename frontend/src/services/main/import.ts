import { Ref, computed, ref, onMounted, onBeforeUnmount } from "vue"
import { remoteIpcClient, FileWatcherStatus } from "@/functions/ipc-client"
import { flatResponse } from "@/functions/http-client"
import { ImportRecord, ImportQueryFilter } from "@/functions/http-client/api/import"
import { OrderTimeType } from "@/functions/http-client/api/setting"
import { SourceDataPath } from "@/functions/http-client/api/all"
import {
    PaginationDataView,
    QueryListview,
    useFetchEndpoint,
    useFetchHelper,
    usePostFetchHelper
} from "@/functions/fetch"
import { useListViewContext } from "@/services/base/list-view-context"
import { SelectedState, useSelectedState } from "@/services/base/selected-state"
import { useSelectedPaneState } from "@/services/base/selected-pane-state"
import { ImportImageViewController, useImportImageViewController } from "@/services/base/view-controller"
import { useSettingSite } from "@/services/setting"
import { installEmbedPreviewService, usePreviewService } from "@/components-module/preview"
import { useBrowserTabs, useDocumentTitle, useTabRoute } from "@/modules/browser"
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
    const operators = useOperators(listview.listview, listview.paginationData, listview.queryFilter, selector, listviewController, importService.addFiles)

    useDroppingFileListener(importService.addFiles)
    useSettingSite()
    useDocumentTitle(() => operators.historyMode.value ? "导入历史" : "导入")

    return {paneState, watcher, importService, listview, selector, listviewController, operators}
})

function useImportService() {
    const toast = useToast()

    const progress = ref({value: 0, max: 0})
    const progressing = computed(() => progress.value.max > 0)

    const addFiles = async (files: string[]) => {
        progress.value.max += files.length

        for (const filepath of files) {
            const r = await remoteIpcClient.local.importFile(filepath)
            if(!r.ok) {
                if(r.code === "FILE_NOT_FOUND") {
                    toast.toast("错误", "danger", `文件${filepath}不存在。`)
                }else if(r.code === "ILLEGAL_FILE_EXTENSION") {
                    toast.toast("错误", "danger", `文件${filepath}的类型不适用。`)
                }else if(r.code === "STORAGE_NOT_ACCESSIBLE") {
                    toast.toast("错误", "danger", `存储位置目前不可用。`)
                }else{
                    toast.handleError("错误", r.message ?? "")
                }
            }
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
    const state = ref<FileWatcherStatus>()
    const paths = ref<string[]>([])

    onMounted(async () => {
        state.value = await remoteIpcClient.local.fileWatcherStatus()
        paths.value = (await remoteIpcClient.setting.storage.get()).fileWatchPaths
        remoteIpcClient.local.fileWatcherChangedEvent.addEventListener(onUpdated)
    })

    onBeforeUnmount(() => remoteIpcClient.local.fileWatcherChangedEvent.removeEventListener(onUpdated))

    const onUpdated = (newValue: FileWatcherStatus) => {
        state.value = newValue
    }

    const setState = async (opened: boolean) => {
        await remoteIpcClient.local.fileWatcherStatus(opened)
        paths.value = (await remoteIpcClient.setting.storage.get()).fileWatchPaths
    }

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

function useOperators(listview: QueryListview<ImportRecord, number>, paginationData: PaginationDataView<ImportRecord>, queryFilter: Ref<ImportQueryFilter>, selector: SelectedState<number>, listviewController: ImportImageViewController, addFiles: (f: string[]) => void) {
    const toast = useToast()
    const message = useMessageBox()
    const router = useTabRoute()
    const browserTabs = useBrowserTabs()
    const preview = installEmbedPreviewService()
    const batchFetch = useFetchHelper(client => client.import.batch)

    const historyMode = computed({
        get: () => queryFilter.value.deleted ?? false,
        set: value => queryFilter.value.deleted = value
    })

    const getEffectedItems = (id: number): number[] => {
        return selector.selected.value.includes(id) ? selector.selected.value : [id]
    }

    const openImageInPartition = async (importRecord: ImportRecord, at?: "NEW_TAB" | "NEW_WINDOW") => {
        if(importRecord.illust !== null) {
            if(at === "NEW_TAB") browserTabs.newTab({routeName: "PartitionDetail", path: importRecord.illust.partitionTime, initializer: {locateId: importRecord.illust.id}})
            else if(at === "NEW_WINDOW") browserTabs.newWindow({routeName: "PartitionDetail", path: importRecord.illust.partitionTime, initializer: {locateId: importRecord.illust.id}})
            else router.routePush({routeName: "PartitionDetail", path: importRecord.illust.partitionTime, initializer: {locateId: importRecord.illust.id}})
        }
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
                    extensions: ["jpeg", "jpe", "jpg", "png", "gif", "mp4", "webm", "ogv"]
                }
            ],
            properties: ["openFile", "multiSelections", "createDirectory"]
        })

        if(files) {
            addFiles(files)
        }
    }

    const openImagePreview = (importImage?: ImportRecord | number) => {
        if(importImage !== undefined) {
            const illustId = typeof importImage === "object" ? importImage.id : importImage
            //如果指定项已选中，那么将最后选中项重新指定为指定项；如果未选中，那么将单独选中此项
            if(selector.lastSelected.value !== illustId) {
                if(selector.selected.value.includes(illustId)) {
                    selector.update(selector.selected.value, illustId)
                }else{
                    selector.update([illustId], illustId)
                }
            }
        }
        if(selector.selected.value.length > 0) preview.show({
            preview: "image", 
            type: "listview", 
            listview: listview,
            paginationData: paginationData,
            columnNum: listviewController.columnNum,
            viewMode: listviewController.viewMode,
            selected: selector.selected,
            selectedIndex: selector.selectedIndex,
            lastSelected: selector.lastSelected,
            updateSelect: selector.update
        })
    }

    const analyseSource = async (importImage: ImportRecord) => {
        const res = await batchFetch({target: getEffectedItems(importImage.id), analyseSource: true})
        if(res !== undefined) toast.toast("已重新生成", "success", "已从导入记录重新生成项目的来源属性。")
    }

    const analyseTime = async (importImage: ImportRecord, timeType?: OrderTimeType) => {
        const res = await batchFetch({target: getEffectedItems(importImage.id), analyseTime: true, analyseTimeBy: timeType})
        if(res !== undefined) toast.toast("已重新生成", "success", "已从导入记录重新生成项目的时间属性。")
    }

    const retry = (importImage: ImportRecord, noneSourceData?: boolean) => batchFetch({target: getEffectedItems(importImage.id), retry: true, retryAndAllowNoSource: noneSourceData})

    const clear = async () => {
        if(await message.showYesNoMessage("warn", "确定要清除所有记录吗？", historyMode.value ? "历史记录将被彻底删除。" : "已被删除的记录短期内可在历史记录中查看。相关的图库项目不会被删除。")) {
            batchFetch({clearCompleted: !historyMode.value, deleteDeleted: historyMode.value}).finally()
        }
    }

    return {historyMode, openDialog, deleteItem, openImageInPartition, openImagePreview, analyseSource, analyseTime, retry, clear}
}

export function useImportDetailPane() {
    const toast = useToast()
    const message = useMessageBox()
    const preview = usePreviewService()
    const router = useTabRoute()
    const { listview, listviewController, selector } = useImportContext()
    const batchFetch = usePostFetchHelper(client => client.import.batch)

    const path = computed(() => selector.lastSelected.value ?? selector.selected.value[selector.selected.value.length - 1] ?? null)

    const { data } = useFetchEndpoint({
        path,
        get: client => client.import.get,
        eventFilter: c => event => ((event.eventType === "entity/import/updated" || event.eventType === "entity/import/deleted") && event.importId === c.path) || ((event.eventType === "entity/illust/deleted" || event.eventType === "entity/illust/updated") && event.illustType === "IMAGE" && event.illustId === c.data?.illust?.id)
    })

    const analyseTime = async (timeType?: OrderTimeType) => {
        const res = await batchFetch({target: [path.value], analyseTime: true, analyseTimeBy: timeType})
        if(res !== undefined) toast.toast("已重新生成", "success", "已从导入记录重新生成项目的时间属性。")
    }

    const retryAllowNoSource = () => batchFetch({target: [path.value], retry: true, retryAndAllowNoSource: true})

    const retryWithSource = (sourceData: SourceDataPath) => batchFetch({target: [path.value], retry: true, retryWithManualSource: sourceData})

    const showStatusInfoMessage = (type: "thumbnailError" | "fingerprintError" | "sourceAnalyseError" | "sourceAnalyseNone" | "else") => {
        const info = type === "thumbnailError" ? "缩略图生成失败"
            : type === "fingerprintError" ? "指纹生成失败"
            : type === "sourceAnalyseError" ? "来源数据解析失败"
            : type === "sourceAnalyseNone" ? "无来源数据"
            : "发生内部错误"
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
            paginationData: listview.paginationData,
            columnNum: listviewController.columnNum,
            viewMode: listviewController.viewMode,
            selected: selector.selected,
            selectedIndex: selector.selectedIndex,
            lastSelected: selector.lastSelected,
            updateSelect: selector.update
        })
    }

    return {path, data, selector, gotoIllust, showStatusInfoMessage, openImagePreview, analyseTime, retryAllowNoSource, retryWithSource}
}
