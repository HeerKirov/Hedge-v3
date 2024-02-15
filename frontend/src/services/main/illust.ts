import { computed, reactive, ref, Ref, watch } from "vue"
import { useLocalStorage } from "@/functions/app"
import { mapResponse } from "@/functions/http-client"
import { QueryListview, useFetchEndpoint, useFetchHelper, usePostFetchHelper, usePostPathFetchHelper } from "@/functions/fetch"
import { CommonIllust, IllustQueryFilter, Tagme } from "@/functions/http-client/api/illust"
import { FilePath, SourceDataPath } from "@/functions/http-client/api/all"
import { SimpleBook } from "@/functions/http-client/api/book"
import { SimpleFolder } from "@/functions/http-client/api/folder"
import { SourceEditStatus } from "@/functions/http-client/api/source-data"
import { useStackedView } from "@/components-module/stackedview"
import { usePreviewService } from "@/components-module/preview"
import { useDialogService } from "@/components-module/dialog"
import { useToast } from "@/modules/toast"
import { useInterceptedKey } from "@/modules/keyboard"
import { useMessageBox } from "@/modules/message-box"
import { useBrowserTabs, useDocumentTitle, useInitializer, usePath, useTabRoute } from "@/modules/browser"
import { useListViewContext } from "@/services/base/list-view-context"
import { useSelectedState } from "@/services/base/selected-state"
import { useSelectedPaneState } from "@/services/base/selected-pane-state"
import { useIllustViewController } from "@/services/base/view-controller"
import { useQuerySchema } from "@/services/base/query-schema"
import { useSettingSite } from "@/services/setting"
import { installIllustListviewContext, useIllustListviewContext, useImageDatasetOperators, useLocateId } from "@/services/common/illust"
import { date, datetime, LocalDate, LocalDateTime } from "@/utils/datetime"
import { arrays, objects } from "@/utils/primitives"
import { useListeningEvent } from "@/utils/emitter"
import { toRef } from "@/utils/reactivity"

export function useIllustContext() {
    const querySchema = useQuerySchema("ILLUST")
    const listview = useIllustListView(querySchema.query)
    const selector = useSelectedState({queryListview: listview.listview, keyOf: item => item.id})
    const paneState = useSelectedPaneState("illust")
    const listviewController = useIllustViewController(toRef(listview.queryFilter, "type"))
    const operators = useImageDatasetOperators({
        listview: listview.listview, paginationData: listview.paginationData,
        listviewController, selector, embedPreview: "auto",
        dataDrop: {dropInType: "illust", querySchema: querySchema.schema, queryFilter: listview.queryFilter}
    })
    const locateId = useLocateId({queryFilter: listview.queryFilter, paginationData: listview.paginationData, selector})

    installIllustListviewContext({listview, selector, listviewController})

    useSettingSite()

    useInitializer(params => {
        if(params.query) {
            querySchema.queryInputText.value = params.query
        }else if(params.tagName || params.authorName || params.topicName || params.source) {
            //监听router event。只监听Illust的，Partition没有。对于meta tag，将其简单地转换为DSL的一部分。
            //FUTURE 当然这其实是有问题的，对于topic/tag，还应该使用地址去限制它们。
            querySchema.queryInputText.value = [
                params.tagName ? `$\`${params.tagName}\`` : undefined,
                params.topicName ? `#\`${params.topicName}\`` : undefined,
                params.authorName ? `@\`${params.authorName}\`` : undefined,
                params.source ? `^SITE:${params.source.site} ^ID:${params.source.id}` : undefined
            ].filter(i => i !== undefined).join(" ")

            //对于source，需要将collectionMode转为IMAGE，否则有可能看不到搜索结果
            if(params.source) listviewController.collectionMode.value = "IMAGE"

        }else if(params.locateId !== undefined && querySchema.queryInputText.value) {
            //若提供了Locate，则应该清空现有的查询条件，除非上面也提供了别的查询条件
            querySchema.queryInputText.value = undefined
        }

        locateId.catchLocateId(params.locateId)
    })

    return {paneState, listview, selector, listviewController, querySchema, operators}
}

function useIllustListView(query: Ref<string | undefined>) {
    const listview = useListViewContext({
        defaultFilter: <IllustQueryFilter>{order: "-orderTime", type: "IMAGE"},
        request: client => (offset, limit, filter) => client.illust.list({offset, limit, ...filter}),
        keyOf: item => item.id,
        eventFilter: {
            filter: ["entity/illust/created", "entity/illust/updated", "entity/illust/deleted", "entity/illust/images/changed"],
            operation({ event, refresh, updateKey, removeKey }) {
                if(event.eventType === "entity/illust/created" || (event.eventType === "entity/illust/updated" && event.timeSot)) {
                    refresh()
                }else if(event.eventType === "entity/illust/updated" && event.listUpdated) {
                    updateKey(event.illustId)
                }else if(event.eventType === "entity/illust/deleted") {
                    if(event.illustType === "COLLECTION") {
                        if(listview.queryFilter.value.type === "COLLECTION") {
                            refresh()
                        }
                    }else{
                        removeKey(event.illustId)
                    }
                }else if(event.eventType === "entity/illust/images/changed") {
                    if(listview.queryFilter.value.type === "COLLECTION") {
                        refresh()
                    }
                }
            },
            request: client => async items => mapResponse(await client.illust.findByIds(items.map(i => i.id)), r => r.map(i => i !== null ? i : undefined))
        }
    })

    watch(query, query => listview.queryFilter.value.query = query, {immediate: true})

    return listview
}

export function useCollectionContext() {
    const path = usePath<number>()
    const target = useCollectionTarget(path)
    const listview = useCollectionListView(path)
    const selector = useSelectedState({queryListview: listview.listview, keyOf: item => item.id})
    const paneState = useSelectedPaneState("illust")
    const listviewController = useIllustViewController()
    const operators = useImageDatasetOperators({
        listview: listview.listview, paginationData: listview.paginationData,
        listviewController, selector, embedPreview: "auto",
        dataDrop: {dropInType: "collection", path}
    })

    const sideBar = useCollectionSideBarContext()

    installIllustListviewContext({listview, selector, listviewController})

    useSettingSite()

    useDocumentTitle(() => `集合${path.value}`)

    return {target, sideBar, listview, selector, paneState, listviewController, operators}
}

function useCollectionTarget(path: Ref<number>) {
    const router = useTabRoute()
    const message = useMessageBox()

    const { data, setData, deleteData } = useFetchEndpoint({
        path,
        get: client => client.illust.collection.get,
        update: client => client.illust.collection.update,
        delete: client => client.illust.collection.delete,
        eventFilter: c => event => (event.eventType === "entity/illust/updated" || event.eventType === "entity/illust/deleted") && event.illustId === c.path,
        afterRetrieve: (path, data) => {
            if(path !== null && data === null) router.routeClose()
        }
    })
    const toggleFavorite = () => {
        if(data.value !== null) {
            setData({favorite: !data.value.favorite}).finally()
        }
    }

    const deleteItem = async () => {
        if(await message.showYesNoMessage("warn", "确定要删除此项吗？", "此操作不可撤回。")) {
            await deleteData()
        }
    }

    return {path, data, toggleFavorite, deleteItem}
}

function useCollectionListView(path: Ref<number | null>) {
    return useListViewContext({
        filter: path,
        request: client => async (offset, limit, filter) => {
            if(filter === null) {
                return {ok: true, status: 200, data: {total: 0, result: []}}
            }
            return await client.illust.collection.images.get(filter, {offset, limit})
        },
        keyOf: item => item.id,
        eventFilter: {
            filter: ["entity/illust/updated", "entity/illust/deleted", "entity/illust/images/changed"],
            operation({ event, refresh, updateKey, removeKey }) {
                if((event.eventType === "entity/illust/images/changed" && event.illustId === path.value) || (event.eventType === "entity/illust/updated" && event.illustType === "IMAGE" && event.timeSot)) {
                    refresh()
                }else if(event.eventType === "entity/illust/updated" && event.listUpdated && event.illustType === "IMAGE") {
                    updateKey(event.illustId)
                }else if(event.eventType === "entity/illust/deleted") {
                    removeKey(event.illustId)
                }
            },
            request: client => async items => mapResponse(await client.illust.findByIds(items.map(i => i.id)), r => r.map(i => i !== null ? i : undefined))
        }
    })
}

function useCollectionSideBarContext() {
    const storage = useLocalStorage<{tabType: "info"| "related"}>("collection-detail-view/side-bar", () => ({tabType: "info"}), true)

    const tabType = toRef(storage, "tabType")

    //由于Meta+N快捷键可能被Illust列表的侧边栏占用，因此此处提供了一个Meta+Shift+N的快捷键
    useInterceptedKey(["Meta+Digit1", "Meta+Digit2", "Meta+Shift+Digit1", "Meta+Shift+Digit2"], e => {
        if(e.key === "Digit1") tabType.value = "info"
        else if(e.key === "Digit2") tabType.value = "related"
    })

    return {tabType}
}

export function useIllustDetailPane() {
    const preview = usePreviewService()
    const { listview, selector, listviewController, book, folder } = useIllustListviewContext()

    const storage = useLocalStorage<{tabType: "info" | "source" | "related", multiple: boolean}>("illust/list/pane", () => ({tabType: "info", multiple: true}), true)

    const tabType = computed({
        get: () => selector.selected.value.length > 1 && storage.value.multiple ? "action" : storage.value.tabType,
        set: (value) => {
            if(selector.selected.value.length > 1) {
                if(value !== "action") {
                    storage.value = {tabType: value, multiple: false}   
                }else if(!storage.value.multiple) {
                    storage.value.multiple = true
                }
            }else if(value !== "action") {
                storage.value.tabType = value
            }
        }
    })

    const path = computed(() => selector.lastSelected.value ?? selector.selected.value[selector.selected.value.length - 1] ?? null)

    const detail = useIllustDetailPaneId(path, listview.listview)

    const parent = computed(() => {
        if(book !== undefined && book.value !== null) {
            return {type: "book", bookId: typeof book.value === "number" ? book.value : book.value.id} as const
        }else if(folder !== undefined && folder.value !== null) {
            return {type: "folder", folderId: typeof folder.value === "number" ? folder.value : folder.value.id} as const
        }
    })

    useInterceptedKey(["Meta+Digit1", "Meta+Digit2", "Meta+Digit3", "Meta+Digit4"], e => {
        if(e.key === "Digit1") tabType.value = "info"
        else if(e.key === "Digit2") tabType.value = "related"
        else if(e.key === "Digit3") tabType.value = "source"
        else if(e.key === "Digit4") tabType.value = "action"
    })

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

    return {tabType, detail, selector, parent, openImagePreview}
}

function useIllustDetailPaneId(path: Ref<number | null>, listview: QueryListview<CommonIllust, number>) {
    const detail = ref<{id: number, type: "IMAGE" | "COLLECTION", filePath: FilePath} | null>(null)

    const fetch = useFetchHelper({
        request: client => client.illust.get, 
        handleErrorInRequest(e) {
            if(e.code !== "NOT_FOUND") {
                return e
            }
        }
    })

    watch(path, async path => {
        if(path !== null) {
            const idx = listview.proxy.sync.findByKey(path)
            if(idx !== undefined) {
                const item = listview.proxy.sync.retrieve(idx)!
                detail.value = {id: item.id, type: item.type ?? "IMAGE", filePath: item.filePath}
            }else{
                const res = await fetch(path)
                detail.value = res !== undefined ? {id: res.id, type: res.type ?? "IMAGE", filePath: res.filePath} : null
            }
        }else{
            detail.value = null
        }
    }, {immediate: true})

    useListeningEvent(listview.modifiedEvent, async e => {
        if(path.value !== null) {
            if(e.type === "FILTER_UPDATED" || e.type === "REFRESH") {
                const idx = listview.proxy.sync.findByKey(path.value)
                if(idx !== undefined) {
                    const item = listview.proxy.sync.retrieve(idx)!
                    detail.value = {id: item.id, type: item.type ?? "IMAGE", filePath: item.filePath}
                }else{
                    const res = await fetch(path.value)
                    detail.value = res !== undefined ? {id: res.id, type: res.type ?? "IMAGE", filePath: res.filePath} : null
                }
            }else if(e.type === "MODIFY" && e.value.id === path.value) {
                detail.value = {id: e.value.id, type: e.value.type ?? "IMAGE", filePath: e.value.filePath}
            }else if(e.type === "REMOVE" && e.oldValue.id === path.value) {
                detail.value = null
            }
        }
    })

    return detail
}

export function useSideBarAction(selected: Ref<number[]>, parent: Ref<{type: "book", bookId: number} | {type: "folder", folderId: number} | null | undefined> | undefined) {
    const toast = useToast()
    const { metaTagEditor } = useDialogService()

    const { listview: { listview } } = useIllustListviewContext()

    const batchFetch = usePostFetchHelper({
        request: httpClient => httpClient.illust.batchUpdate,
        afterRequest: () => toast.toast("批量编辑完成", "info", "已完成所选项目的更改。")
    })
    const bookBatchFetch = usePostPathFetchHelper({
        request: httpClient => httpClient.book.images.partialUpdate,
        afterRequest: () => toast.toast("批量编辑完成", "info", "已完成所选项目的更改。")
    })
    const folderBatchFetch = usePostPathFetchHelper({
        request: httpClient => httpClient.folder.images.partialUpdate,
        afterRequest: () => toast.toast("批量编辑完成", "info", "已完成所选项目的更改。")
    })

    const actives = reactive({partitionTime: false, orderTime: false})

    const form = reactive<{
        score: number | null,
        description: string,
        tagme: Tagme[],
        partitionTime: LocalDate | null,
        orderTime: {
            begin: LocalDateTime,
            end: LocalDateTime
        } | null
    }>({
        score: null,
        description: "",
        tagme: [],
        partitionTime: null,
        orderTime: null
    })

    watch(selected, () => {
        if(actives.partitionTime) actives.partitionTime = false
        if(actives.orderTime) actives.orderTime = false
        if(form.score !== null) form.score = null
        if(form.description) form.description = ""
        if(form.tagme.length) form.tagme = []
        if(form.partitionTime) form.partitionTime = null
        if(form.orderTime) form.orderTime = null
    })

    const editMetaTag = async (updateMode: "APPEND" | "OVERRIDE" | "REMOVE") => {
        metaTagEditor.editBatch(selected.value, updateMode, () => toast.toast("批量编辑完成", "info", "已完成标签的更改。"))
    }

    const setScore = (score: number | null) => {
        if(score !== form.score) {
            form.score = score
            batchFetch({target: selected.value, score})
        }
    }

    const setDescription = async (description: string): Promise<boolean> => {
        if(description !== form.description) {
            form.description = description
            return await batchFetch({target: selected.value, description})
        }
        return true
    }

    const setTagme = async (tagme: Tagme[]): Promise<boolean> => {
        if(tagme !== form.tagme) {
            form.tagme = tagme
            return await batchFetch({target: selected.value, tagme})
        }
        return true
    }

    const editPartitionTime = () => {
        if(!actives.partitionTime && !form.partitionTime) {
            const counter: Record<number, { value: LocalDate, count: number }> = {}
            for(const selectedId of selected.value) {
                const idx = listview.proxy.sync.findByKey(selectedId)
                if(idx !== undefined) {
                    const ord = listview.proxy.sync.retrieve(idx)!.orderTime
                    const cur = date.ofDate(ord.year, ord.month, ord.day)
                    const c = counter[cur.timestamp] ?? (counter[cur.timestamp] = {value: cur, count: 0})
                    c.count += 1
                }
            }
            form.partitionTime = arrays.maxBy(Object.values(counter), v => v.count)?.value ?? date.now()
        }
        actives.partitionTime = !actives.partitionTime
    }

    const editOrderTimeRange = () => {
        if(!actives.orderTime && !form.orderTime) {
            let min: LocalDateTime | undefined = undefined, max: LocalDateTime | undefined = undefined
            for(const selectedId of selected.value) {
                const idx = listview.proxy.sync.findByKey(selectedId)
                if(idx !== undefined) {
                    const cur = listview.proxy.sync.retrieve(idx)!.orderTime
                    if(min === undefined || cur.timestamp < min.timestamp) min = cur
                    if(max === undefined || cur.timestamp > max.timestamp) max = cur
                }
            }
            form.orderTime = {
                begin: min ?? datetime.now(),
                end: max ?? datetime.now()
            }
        }
        actives.orderTime = !actives.orderTime
    }

    const submitPartitionTime = async () => {
        if(actives.partitionTime && form.partitionTime && await batchFetch({target: selected.value, partitionTime: form.partitionTime})) {
            actives.partitionTime = false
        }
    }

    const submitOrderTimeRange = async () => {
        if(actives.orderTime && form.orderTime && await batchFetch({target: selected.value, orderTimeBegin: form.orderTime.begin, orderTimeEnd: form.orderTime.end})) {
            actives.orderTime = false
        }
    }

    const partitionTimeAction = (action: "TODAY" | "EARLIEST" | "LATEST" | "MOST") => {
        batchFetch({target: selected.value, action: `SET_PARTITION_TIME_${action}`})
    }

    const orderTimeAction = (action: "NOW" | "REVERSE" | "UNIFORMLY" | "MOST" | "BY_SOURCE_ID" | "BY_ORDINAL") => {
        if(action === "BY_ORDINAL") {
            if(parent?.value?.type === "book") {
                batchFetch({target: selected.value, action: "SET_ORDER_TIME_BY_BOOK_ORDINAL", actionBy: parent.value.bookId})
            }else if(parent?.value?.type === "folder") {
                batchFetch({target: selected.value, action: "SET_ORDER_TIME_BY_FOLDER_ORDINAL", actionBy: parent.value.folderId})
            }
        }else{
            batchFetch({target: selected.value, action: `SET_ORDER_TIME_${action}`})
        }
    }

    const ordinalAction = (action: "MOVE_TO_HEAD" | "MOVE_TO_TAIL" | "REVERSE" | "SORT_BY_ORDER_TIME" | "SORT_BY_SOURCE_ID") => {
        if(parent?.value?.type === "book") {
            if(action === "MOVE_TO_HEAD") {
                bookBatchFetch(parent.value.bookId, {action: "MOVE", ordinal: 0, images: selected.value})
            }else if(action === "MOVE_TO_TAIL") {
                bookBatchFetch(parent.value.bookId, {action: "MOVE", ordinal: null, images: selected.value})
            }else{
                bookBatchFetch(parent.value.bookId, {action, images: selected.value})
            }
        }else if(parent?.value?.type === "folder") {
            if(action === "MOVE_TO_HEAD") {
                folderBatchFetch(parent.value.folderId, {action: "MOVE", ordinal: 0, images: selected.value})
            }else if(action === "MOVE_TO_TAIL") {
                folderBatchFetch(parent.value.folderId, {action: "MOVE", ordinal: null, images: selected.value})
            }else{
                folderBatchFetch(parent.value.folderId, {action, images: selected.value})
            }
        }
    }

    return {actives, form, setScore, setDescription, setTagme, editMetaTag, editPartitionTime, editOrderTimeRange, submitPartitionTime, submitOrderTimeRange, partitionTimeAction, orderTimeAction, ordinalAction}
}

export function useSideBarDetailInfo(path: Ref<number | null>) {
    const dialog = useDialogService()
    const { data, setData } = useFetchEndpoint({
        path,
        get: client => client.illust.get,
        update: client => client.illust.update,
        eventFilter: c => event => event.eventType === "entity/illust/updated" && event.illustId === c.path && event.detailUpdated
    })
 
    const setDescription = async (description: string) => {
        return description === data.value?.description || await setData({description})
    }
    const setScore = async (score: number | null) => {
        return score === data.value?.score || await setData({score})
    }
    const setTime = async ({ partitionTime, orderTime }: {partitionTime: LocalDateTime, orderTime: LocalDateTime}) => {
        const partitionTimeSot = partitionTime.timestamp !== data.value?.partitionTime?.timestamp
        const orderTimeSot = orderTime.timestamp !== data.value?.orderTime?.timestamp
        return !partitionTimeSot && !orderTimeSot || await setData({
            partitionTime: partitionTimeSot ? partitionTime : undefined,
            orderTime: orderTimeSot ? orderTime : undefined
        })
    }
    const openMetaTagEditor = () => {
        if(data.value !== null) {
            dialog.metaTagEditor.editIdentity({type: data.value.type, id: data.value.id})
        }
    }

    return {data, id: path, setDescription, setScore, setTime, openMetaTagEditor}
}

export function useSideBarRelatedItems(path: Ref<number | null>, illustType: Ref<"IMAGE" | "COLLECTION">) {
    const viewStack = useStackedView()
    const browserTabs = useBrowserTabs()
    const router = useTabRoute()
    const dialog = useDialogService()
    const { data } = useFetchEndpoint({
        path,
        get: client => async path => {
            if(illustType.value === "IMAGE") {
                return await client.illust.image.relatedItems.get(path, {limit: 9})
            }else{
                return mapResponse(await client.illust.collection.relatedItems.get(path, {limit: 9}), d => ({associates: d.associates, collection: null, books: d.books, folders: d.folders}))
            }
        },
        eventFilter: c => event => event.eventType === "entity/illust/related-items/updated" && event.illustId === c.path
    })

    const openRelatedBook = (book: SimpleBook) => {
        router.routePush({routeName: "BookDetail", path: book.id})
    }

    const openRelatedCollection = () => {
        const id = data.value?.collection?.id
        if(id !== undefined) {
            router.routePush({routeName: "CollectionDetail", path: id})
        }
    }

    const openAssociate = () => {
        if(path.value !== null) {
            dialog.associateExplorer.openAssociateView(path.value)
        }
    }

    const openAssociateInNewView = (index?: number) => {
        if(data.value?.associates.length) {
            viewStack.openImageView({imageIds: data.value.associates.map(i => i.id), focusIndex: index})
        }
    }

    const openFolderInNewTab = (folder: SimpleFolder) => {
        browserTabs.newTab({routeName: "MainFolder", params: {detail: folder.id}})
    }

    const openFolderInNewWindow = (folder: SimpleFolder) => {
        browserTabs.newWindow({routeName: "MainFolder", params: {detail: folder.id}})
    }

    return {data, openRelatedBook, openRelatedCollection, openAssociate, openAssociateInNewView, openFolderInNewTab, openFolderInNewWindow}
}

export function useSideBarSourceData(path: Ref<number | null>) {
    const message = useMessageBox()
    const dialog = useDialogService()
    const { data, setData } = useFetchEndpoint({
        path,
        get: client => client.illust.image.sourceData.get,
        update: client => client.illust.image.sourceData.update,
        eventFilter: c => event => event.eventType === "entity/illust/source-data/updated" && event.illustId === c.path
    })

    useSettingSite()

    const sourceDataPath: Ref<SourceDataPath | null> = computed(() => data.value?.source ?? null)

    const setSourceDataPath = async (source: SourceDataPath | null) => {
        return objects.deepEquals(source, data.value?.source) || await setData({source}, e => {
            if(e.code === "NOT_EXIST" && e.info[0] === "site") {
                message.showOkMessage("error", `来源${source?.sourceSite}不存在。`)
            }else if(e.code === "PARAM_ERROR") {
                const target = e.info === "sourceId" ? "来源ID" : e.info === "sourcePart" ? "分页" : e.info === "sourcePartName" ? "分页页名": e.info
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

    const setSourceStatus = async (status: SourceEditStatus) => {
        return (status === data.value?.status) || await setData({status})
    }

    const openSourceDataEditor = () => {
        if(data.value !== null && data.value.source !== null) {
            dialog.sourceDataEditor.edit({sourceSite: data.value.source.sourceSite, sourceId: data.value.source.sourceId})
        }
    }

    return {data, sourceDataPath, setSourceDataPath, setSourceStatus, openSourceDataEditor}
}