import { computed, onActivated, reactive, ref, Ref, watch } from "vue"
import { mapResponse } from "@/functions/http-client"
import { QueryListview, useFetchEndpoint, useFetchHelper, usePostFetchHelper, usePostPathFetchHelper } from "@/functions/fetch"
import { CollectionRelatedItems, CommonIllust, Illust, IllustExceptions, IllustQueryFilter, ImageRelatedItems, Tagme } from "@/functions/http-client/api/illust"
import { FilePath, SourceDataPath } from "@/functions/http-client/api/all"
import { SimpleBook } from "@/functions/http-client/api/book"
import { SimpleFolder } from "@/functions/http-client/api/folder"
import { SourceEditStatus } from "@/functions/http-client/api/source-data"
import { useStackedView } from "@/components-module/stackedview"
import { usePreviewService } from "@/components-module/preview"
import { useDialogService } from "@/components-module/dialog"
import { useToast } from "@/modules/toast"
import { MessageBoxManager, useMessageBox } from "@/modules/message-box"
import {
    isBrowserEnvironment,
    useBrowserTabs,
    useDocumentTitle,
    useInitializer,
    usePath,
    useTabRoute
} from "@/modules/browser"
import { useListViewContext } from "@/services/base/list-view-context"
import { useSelectedState } from "@/services/base/selected-state"
import { useSelectedPaneState } from "@/services/base/selected-pane-state"
import { useIllustViewController } from "@/services/base/view-controller"
import { QuerySchemaContext, useQuerySchema } from "@/services/base/query-schema"
import { useSettingSite } from "@/services/setting"
import { installIllustListviewContext, useIllustListviewContext, useImageDatasetOperators, useLocateId } from "@/services/common/illust"
import { date, datetime, LocalDate, LocalDateTime } from "@/utils/datetime"
import { arrays, objects } from "@/utils/primitives"
import { useListeningEvent } from "@/utils/emitter"
import { toRef } from "@/utils/reactivity"

export function useIllustContext() {
    const querySchema = useQuerySchema("ILLUST")
    const listview = useIllustListView(querySchema)
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

function useIllustListView(querySchema: QuerySchemaContext) {
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

    const status = computed(() => ({
        loading: listview.paginationData.status.value.loading || querySchema.status.value.loading,
        timeCost: (listview.paginationData.status.value.timeCost ?? 0) + (querySchema.status.value.timeCost ?? 0)
    }))

    watch(querySchema.query, query => listview.queryFilter.value.query = query, {immediate: true})

    return {...listview, status}
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

    installIllustListviewContext({listview, selector, listviewController})

    useSettingSite()

    useDocumentTitle(() => `集合${path.value}`)

    return {target, listview, selector, paneState, listviewController, operators}
}

function useCollectionTarget(path: Ref<number>) {
    const router = useTabRoute()
    const message = useMessageBox()

    const { data, setData, deleteData } = useFetchEndpoint({
        path,
        get: client => client.illust.getSimple,
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

export function useIllustDetailPane() {
    const preview = usePreviewService()
    const { listview, selector, listviewController, book, folder } = useIllustListviewContext()

    const path = computed(() => selector.lastSelected.value ?? selector.selected.value[selector.selected.value.length - 1] ?? null)

    const detail = useIllustDetailPaneId(path, listview.listview)

    const parent = computed(() => {
        if(book !== undefined && book.value !== null) {
            return {type: "book", bookId: typeof book.value === "number" ? book.value : book.value.id} as const
        }else if(folder !== undefined && folder.value !== null) {
            return {type: "folder", folderId: typeof folder.value === "number" ? folder.value : folder.value.id} as const
        }
    })

    const openImagePreview = () => {
        if(selector.selected.value.length > 0) preview.show({
            preview: "image", 
            type: "listview", 
            listview: listview.listview,
            columnNum: listviewController.columnNum,
            viewMode: listviewController.viewMode,
            selected: selector.selected,
            selectedIndex: selector.selectedIndex,
            lastSelected: selector.lastSelected,
            updateSelect: selector.update
        })
    }

    return {detail, selector, parent, openImagePreview}
}

function useIllustDetailPaneId(path: Ref<number | null>, listview: QueryListview<CommonIllust, number>) {
    const detail = ref<{id: number, type: "IMAGE" | "COLLECTION", filePath: FilePath} | null>(null)

    const fetch = useFetchHelper({
        request: client => client.illust.getSimple,
        handleErrorInRequest(e) {
            if(e.code !== "NOT_FOUND") {
                return e
            }
        }
    })

    watch(path, async path => {
        if(path !== null) {
            const syncIdx = listview.proxy.sync.findByKey(path)
            if(syncIdx !== undefined) {
                const item = listview.proxy.sync.retrieve(syncIdx)!
                detail.value = {id: item.id, type: item.type ?? "IMAGE", filePath: item.filePath}
                return
            }
            const idx = await listview.proxy.findByKey(path)
            if(idx !== undefined) {
                const item = listview.proxy.sync.retrieve(idx)!
                detail.value = {id: item.id, type: item.type ?? "IMAGE", filePath: item.filePath}
                return
            }
            const res = await fetch(path)
            detail.value = res !== undefined ? {id: res.id, type: res.type ?? "IMAGE", filePath: res.filePath} : null
        }else{
            detail.value = null
        }
    }, {immediate: true})

    useListeningEvent(listview.modifiedEvent, async e => {
        if(path.value !== null) {
            if(e.type === "FILTER_UPDATED" || e.type === "REFRESH") {
                const pathValue = path.value
                const idx = await listview.proxy.findByKey(pathValue)
                //异步结束后需要验证path尚未改变。如果已经发生改变，则不执行任何操作，所需要的操作会在其他改变的位置完成。
                //如果不加这个验证，则这里的变更事件极有可能和watch(path)的事件同时交叉响应，在path更改后，此处依然沿用旧值。
                if(pathValue === path.value) {
                    const exist = idx !== undefined ? listview.proxy.sync.retrieve(idx) : undefined
                    if(exist !== undefined) {
                        detail.value = {id: exist.id, type: exist.type ?? "IMAGE", filePath: exist.filePath}
                    }else{
                        const res = await fetch(pathValue)
                        if(pathValue === path.value) {
                            detail.value = res !== undefined ? {id: res.id, type: res.type ?? "IMAGE", filePath: res.filePath} : null
                        }
                    }
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

export function useSideBarAction(selected: Ref<number[]>, selectedIndex: Ref<(number | undefined)[]>, parent: Ref<{type: "book", bookId: number} | {type: "folder", folderId: number} | null | undefined> | undefined) {
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
        favorite: boolean | null,
        description: string,
        tagme: Tagme[],
        partitionTime: LocalDate | null,
        orderTime: {
            begin: LocalDateTime,
            end: LocalDateTime
        } | null
    }>({
        score: null,
        favorite: null,
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

    const setFavorite = (favorite: boolean) => {
        if(favorite !== form.favorite) {
            form.favorite = favorite
            batchFetch({target: selected.value, favorite})
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
        if(!objects.deepEquals(tagme, form.tagme)) {
            form.tagme = tagme
            return await batchFetch({target: selected.value, tagme})
        }
        return true
    }

    const editPartitionTime = async () => {
        if(!actives.partitionTime && !form.partitionTime) {
            const counter: Record<number, { value: LocalDate, count: number }> = {}
            for(const idx of selectedIndex.value) {
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

    const editOrderTimeRange = async () => {
        if(!actives.orderTime && !form.orderTime) {
            let min: LocalDateTime | undefined = undefined, max: LocalDateTime | undefined = undefined
            for(const idx of selectedIndex.value) {
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

    return {actives, form, setScore, setFavorite, setDescription, setTagme, editMetaTag, editPartitionTime, editOrderTimeRange, submitPartitionTime, submitOrderTimeRange, partitionTimeAction, orderTimeAction, ordinalAction}
}

export function useSideBarDetailInfo(path: Ref<number | null>) {
    const message = useMessageBox()
    const dialog = useDialogService()
    const fetchSourceUpdate = usePostPathFetchHelper(client => client.illust.image.sourceData.update)
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
    const setFavorite = async (favorite: boolean) => {
        return favorite === data.value?.favorite || await setData({favorite})
    }
    const setTagme = async (tagme: Tagme[]) => {
        return objects.deepEquals(tagme, data.value?.tagme) || await setData({tagme})
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
    const setSourceDataPath = async (source: SourceDataPath | null) => {
        if(path.value !== null) {
            return objects.deepEquals(source, data.value?.source) || await fetchSourceUpdate(path.value, {source}, e => handleSourceUpdateError(e, source, message))
        }
        return false
    }

    const relatedOperators = useRelatedOperators(path)

    return {data, id: path, setDescription, setScore, setFavorite, setTime, setTagme, openMetaTagEditor, setSourceDataPath, ...relatedOperators}
}

export function useSideBarRelatedItems(path: Ref<number | null>, illustType: Ref<"IMAGE" | "COLLECTION">, backTab: () => void) {
    const { data, loading } = useFetchEndpoint({
        path,
        get: client => async path => {
            if(illustType.value === "IMAGE") {
                return mapResponse(await client.illust.image.relatedItems.get(path), d => (<ImageRelatedItems & CollectionRelatedItems>{...d, children: [], childrenCount: 0}))
            }else{
                return mapResponse(await client.illust.collection.relatedItems.get(path), d => (<ImageRelatedItems & CollectionRelatedItems>{...d, collection: null}))
            }
        },
        eventFilter: c => event => event.eventType === "entity/illust/related-items/updated" && event.illustId === c.path,
        afterRetrieve(path, data) {
            //在无数据时，离开当前选项卡
            if(path !== null) {
                if(data === null || (data.associates.length <= 0 && data.books.length <= 0 && data.childrenCount <= 0 && data.collection === null && data.folders.length <= 0)) {
                    backTab()
                }
            }
        }
    })

    onActivated(() => {
        //由于选项卡会被KeepAlive缓存，它在第二次切换至选项卡时不会发生retrieve，需要在activate事件也做检测
        if(!loading.value && path.value !== null) {
            if(data.value === null || (data.value.associates.length <= 0 && data.value.books.length <= 0 && data.value.childrenCount <= 0 && data.value.collection === null && data.value.folders.length <= 0)) {
                backTab()
            }
        }
    })

    const operators = useRelatedOperators(path)

    return {data, ...operators}
}

export function useSideBarSourceData(path: Ref<number | null>, backTab: () => void) {
    const message = useMessageBox()
    const dialog = useDialogService()
    const { data, setData, loading } = useFetchEndpoint({
        path,
        get: client => client.illust.image.sourceData.get,
        update: client => client.illust.image.sourceData.update,
        eventFilter: c => event => event.eventType === "entity/illust/source-data/updated" && event.illustId === c.path,
        afterRetrieve(path, data) {
            //在无数据时，离开当前选项卡
            if(path !== null) {
                if(data === null || data.source === null) {
                    backTab()
                }
            }
        }
    })

    onActivated(() => {
        //由于选项卡会被KeepAlive缓存，它在第二次切换至选项卡时不会发生retrieve，需要在activate事件也做检测
        if(!loading.value && path.value !== null) {
            if(data.value === null || data.value.source === null) {
                backTab()
            }
        }
    })

    useSettingSite()

    const sourceDataPath: Ref<SourceDataPath | null> = computed(() => data.value?.source ?? null)

    const setSourceDataPath = async (source: SourceDataPath | null) => {
        return objects.deepEquals(source, data.value?.source) || await setData({source}, e => handleSourceUpdateError(e, source, message))
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

function useRelatedOperators(path: Ref<number | null>) {
    const dialog = useDialogService()
    const viewStack = useStackedView()

    const { openCollection, openBook, openFolder } = isBrowserEnvironment() ? (() => {
        const browserTabs = useBrowserTabs()
        const router = useTabRoute()
        return {
            openCollection: (collectionId: number, at?: "newTab" | "newWindow") => {
                if(at === "newTab") {
                    browserTabs.newTab({routeName: "CollectionDetail", path: collectionId})
                }else if(at === "newWindow") {
                    browserTabs.newWindow({routeName: "CollectionDetail", path: collectionId})
                }else{
                    router.routePush({routeName: "CollectionDetail", path: collectionId})
                }
            },
            openBook: (book: SimpleBook, at?: "newTab" | "newWindow") => {
                if(at === "newTab") {
                    browserTabs.newTab({routeName: "BookDetail", path: book.id})
                }else if(at === "newWindow") {
                    browserTabs.newWindow({routeName: "BookDetail", path: book.id})
                }else{
                    router.routePush({routeName: "BookDetail", path: book.id})
                }
            },
            openFolder: (folder: SimpleFolder, at?: "newTab" | "newWindow") => {
                if(at === "newTab") {
                    browserTabs.newTab({routeName: "FolderDetail", path: folder.id})
                }else if(at === "newWindow") {
                    browserTabs.newWindow({routeName: "FolderDetail", path: folder.id})
                }else{
                    router.routePush({routeName: "FolderDetail", path: folder.id})
                }
            }
        }
    })() : {openCollection: undefined, openBook: undefined, openFolder: undefined}

    const openAssociate = () => {
        if(path.value !== null) {
            dialog.associateExplorer.openAssociateView(path.value)
        }
    }

    const openAssociateInViewStack = (associates: Illust[], index?: number) => {
        if(associates.length) {
            viewStack.openImageView({imageIds: associates.map(i => i.id), focusIndex: index})
        }
    }

    return {openCollection, openAssociate, openAssociateInViewStack, openBook, openFolder}
}

function handleSourceUpdateError(e: IllustExceptions["image.sourceData.update"], source: SourceDataPath | null, message: MessageBoxManager): IllustExceptions["image.sourceData.update"] | void {
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
}