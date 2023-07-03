import { computed, onUnmounted, Ref, ref, watch } from "vue"
import {
    DetailIllust, Illust, IllustExceptions,
    ImageRelatedItems, ImageRelatedUpdateForm, ImageSourceData, ImageSourceDataUpdateForm, ImageUpdateForm
} from "@/functions/http-client/api/illust"
import { SimpleBook } from "@/functions/http-client/api/book"
import { SimpleFolder } from "@/functions/http-client/api/folder"
import { SourceEditStatus } from "@/functions/http-client/api/source-data"
import { flatResponse, mapResponse } from "@/functions/http-client"
import {
    AllSlice, ListIndexSlice, SliceDataView, SliceOrPath,
    createLazyFetchEndpoint, useFetchListEndpoint, useFetchSinglePathEndpoint,
    usePostFetchHelper, usePostPathFetchHelper,
    useSliceDataView, useSliceDataViewByRef, useFetchReactive
} from "@/functions/fetch"
import { useAssetsLocal, useLocalStorage } from "@/functions/app"
import { useDialogService } from "@/components-module/dialog"
import { useViewStack } from "@/components-module/view-stack"
import { useGlobalKey, useInterceptedKey } from "@/modules/keyboard"
import { useToast } from "@/modules/toast"
import { useMessageBox } from "@/modules/message-box"
import { useRouterNavigator } from "@/modules/router"
import { openLocalFile, openLocalFileInFolder } from "@/modules/others"
import { useSettingSite } from "@/services/setting"
import { installation, toRef } from "@/utils/reactivity"
import { LocalDateTime } from "@/utils/datetime"

export const [installImageViewContext, useImageViewContext] = installation(function (data: SliceOrPath<Illust, AllSlice<Illust> | ListIndexSlice<Illust>, number[]>, modifiedCallback?: (illustId: number) => void) {
    const slice = useSlice(data)
    const subSlice = useSubSlice(slice)
    const navigator = useNavigator(slice, subSlice)
    const target = useTarget(slice, subSlice)
    const operators = useOperators(target.data, target.id)

    useViewStackCallback(slice, modifiedCallback)

    const sideBar = useSideBarContext(target.id)
    const playBoard = usePlayBoardContext()

    return {navigator, target, operators, sideBar, playBoard}
})

function useSlice(data: SliceOrPath<Illust, AllSlice<Illust> | ListIndexSlice<Illust>, number[]>): SliceDataView<Illust> {
    if(data.type === "slice") {
        return useSliceDataView(data.slice)
    }else{
        const paths = ref([...data.path])

        const { loading, data: listEndpoint } = useFetchListEndpoint({
            paths,
            list: client => client.illust.findByIds,
            get: client => client.illust.get,
            eventFilter: {
                filter: ["entity/illust/updated", "entity/illust/deleted"],
                operation({ update, event }) {
                    if(event.eventType === "entity/illust/updated" && event.listUpdated) {
                        update(i => i.id === event.illustId)
                    }else if(event.eventType === "entity/illust/deleted") {
                        paths.value = paths.value.filter(path => path !== event.illustId)
                    }
                }
            }
        })

        return useSliceDataViewByRef(computed(() => loading.value ? null : listEndpoint.value), data.focusIndex)
    }
}

function useSubSlice(slice: SliceDataView<Illust>) {
    //collection的id，作为path。只有当slice的当前项是collection时，此值不为null
    const parentId = computed(() => slice.data.value?.type === "COLLECTION" ? slice.data.value.id : null)
    //主slice的变更方向
    const defaultLocation = ref<"first" | "last">("first")

    const { loading, data: subItems } = useFetchSinglePathEndpoint({
        path: parentId,
        list: client => async (path: number) => mapResponse(await client.illust.collection.images.get(path, {}), r => r.result),
        eventFilter: {
            filter: ["entity/illust/updated", "entity/illust/deleted"],
            operation({ remove, update, event }) {
                if(event.eventType === "entity/illust/updated" && event.illustType === "IMAGE") {
                    update(i => i.id === event.illustId)
                }else if(event.eventType === "entity/illust/deleted" && event.illustType === "IMAGE") {
                    remove(i => i.id === event.illustId)
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(i => client.illust.image.get(i.id))))
        }
    })

    //根据slice currentIndex的变更调整方向
    watch(slice.currentIndex, (sliceIndex, oldSliceIndex) => {
        if(sliceIndex > oldSliceIndex) {
            defaultLocation.value = "first"
        }else if(sliceIndex < oldSliceIndex) {
            defaultLocation.value = "last"
        }
    })

    return useSliceDataViewByRef(computed(() => loading.value ? null : subItems.value), undefined, defaultLocation)
}

function useNavigator(slice: SliceDataView<Illust>, subSlice: SliceDataView<Illust>) {
    const metrics = computed(() => ({total: slice.count.value ?? 0, current: slice.currentIndex.value}))
    const subMetrics = computed(() => slice.data.value?.type === "COLLECTION" && subSlice.count.value !== null ? {total: subSlice.count.value, current: subSlice.currentIndex.value} : null)

    const prev = () => {
        if(subMetrics.value !== null && subSlice.currentIndex.value > 0) {
            subSlice.currentIndex.value -= 1
        }else{
            prevIllust()
        }
    }

    const prevIllust = (count: number = 1) => {
        if(slice.currentIndex.value > 0) {
            if(slice.currentIndex.value >= count) {
                slice.currentIndex.value -= count
            }else{
                slice.currentIndex.value = 0
            }
        }
    }

    const next = () => {
        if(subMetrics.value !== null && subSlice.count.value !== null && subSlice.currentIndex.value < subSlice.count.value - 1) {
            subSlice.currentIndex.value += 1
        }else{
            nextIllust()
        }
    }

    const nextIllust = (count: number = 1) => {
        if(slice.count.value !== null && slice.currentIndex.value < slice.count.value - 1) {
            if(slice.currentIndex.value <= slice.count.value - count) {
                slice.currentIndex.value += count
            }else{
                slice.currentIndex.value = slice.count.value - 1
            }
        }
    }

    useGlobalKey(e => {
        if(e.key === "ArrowLeft" || e.key === "ArrowUp") {
            if(e.shiftKey) {
                prevIllust(5)
            }else if(e.altKey) {
                prevIllust()
            }else{
                prev()
            }
            e.stopPropagation()
        }else if(e.key === "ArrowDown" || e.key === "ArrowRight") {
            if(e.shiftKey) {
                nextIllust(5)
            }else if(e.altKey) {
                nextIllust()
            }else{
                next()
            }
            e.stopPropagation()
        }
    })

    return {metrics, subMetrics, prev, prevIllust, next, nextIllust}
}

function useTarget(slice: SliceDataView<Illust>, subSlice: SliceDataView<Illust>) {
    const data = computed(() => {
        if(slice.data.value !== null) {
            if(slice.data.value.type === "COLLECTION") {
                return subSlice.data.value
            }else{
                return slice.data.value
            }
        }else{
            return null
        }
    })

    const id = computed(() => data.value?.id ?? null)

    return {data, id}
}

function useOperators(data: Ref<Illust | null>, id: Ref<number | null>) {
    const toast = useToast()
    const message = useMessageBox()
    const dialog = useDialogService()
    const navigator = useRouterNavigator()
    const assetsLocal = useAssetsLocal()

    const fetchSetData = usePostPathFetchHelper(client => client.illust.image.update)
    const fetchDeleteData = usePostFetchHelper(client => client.illust.image.delete)
    const fetchStagingPostUpdate = usePostFetchHelper(client => client.stagingPost.update)

    const toggleFavorite = () => {
        if(data.value !== null) {
            fetchSetData(data.value.id, {favorite: !data.value.favorite}).finally()
        }
    }

    const deleteItem = async () => {
        if(id.value !== null && await message.showYesNoMessage("warn", "确定要删除此项吗？", "此操作不可撤回。")) {
            await fetchDeleteData(id.value)
        }
    }

    const openInNewWindow = () => {
        navigator.newWindow({routeName: "Preview", params: {type: "image", imageIds: [id.value!]}})
    }

    const editMetaTag = () => {
        if(id.value !== null) {
            dialog.metaTagEditor.editIdentity({type: "IMAGE", id: id.value})
        }
    }

    const editSourceData = () => {
        if(data.value !== null && data.value.sourceSite !== null) {
            dialog.sourceDataEditor.edit({sourceSite: data.value.sourceSite, sourceId: data.value.sourceId!})
        }
    }

    const editAssociate = () => {
        if(id.value !== null) {
            dialog.associateExplorer.editAssociate(id.value, [], "append", () => toast.toast("已编辑", "success", "已编辑关联组。"))
        }
    }

    const addToFolder = () => {
        if(id.value !== null) {
            dialog.addToFolder.addToFolder([id.value], () => toast.toast("已添加", "success", "已将图像添加到指定目录。"))
        }
    }

    const addToStagingPost = async () => {
        if(id.value !== null) {
            await fetchStagingPostUpdate({action: "ADD", images: [id.value]})
        }
    }

    const exportItem = () => {
        if(data.value != null) {
            dialog.externalExporter.export("ILLUST", [data.value])
        }
    }

    const openInLocalPreference = () => {
        if(data.value !== null) {
            openLocalFile(assetsLocal.assetsLocal(data.value.file))
        }
    }

    const openInLocalFolder = () => {
        if(data.value !== null) {
            openLocalFileInFolder(assetsLocal.assetsLocal(data.value.file))
        }
    }

    const recentFolders = useRecentFolders(id)

    return {
        toggleFavorite, deleteItem, openInNewWindow, openInLocalPreference, openInLocalFolder,
        editMetaTag, editSourceData, editAssociate, addToFolder, addToStagingPost, exportItem, recentFolders
    }
}

function useRecentFolders(id: Ref<number | null>) {
    const toast = useToast()
    const message = useMessageBox()

    const { data: recentFoldersData } = useFetchReactive({
        get: client => client.searchUtil.history.folders
    })
    const fetchPushHistory = usePostFetchHelper(client => client.searchUtil.history.push)
    const fetchFolderImagesPartialUpdate = usePostPathFetchHelper({
        request: client => client.folder.images.partialUpdate,
        handleErrorInRequest(e) {
            if(e.code === "REJECT") {
                message.showOkMessage("prompt", "不能选择节点作为添加对象。")
            }
        }
    })

    const add = async (folderId: number) => {
        if(id.value !== null) {
            const res = await fetchFolderImagesPartialUpdate(folderId, {action: "ADD", images: [id.value]})
            if(res) {
                fetchPushHistory({type: "FOLDER", id: folderId}).finally()
                toast.toast("已添加", "success", "已将图像添加到指定目录。")
            }
        }
    }

    return computed(() => {
        if(recentFoldersData.value?.length) {
            const id = recentFoldersData.value[0].id
            return [{fullName: recentFoldersData.value[0].address.join("/"), click: () => add(id)}]
        }else{
            return []
        }
    })
}

function useViewStackCallback(slice: SliceDataView<Illust>, modifiedCallback?: (illustId: number) => void) {
    const { isClosable, closeView } = useViewStack()

    //列表清空时，自动关闭视图
    watch(slice.count, cnt => {
        if(cnt !== null && cnt <= 0 && isClosable()) {
            closeView()
        }
    })

    //组件卸载时调用回调函数，告知当前所处的illust的id
    if(modifiedCallback) onUnmounted(() => {
        if(slice.data.value !== null) {
            modifiedCallback(slice.data.value?.id)
        }
    })
}

function usePlayBoardContext() {
    const zoomEnabled = ref(true)
    const zoomValue = ref(100)
    return {zoomEnabled, zoomValue}
}

function useSideBarContext(path: Ref<number | null>) {
    const storage = useLocalStorage<{tabType: "info" | "source" | "related"}>("image-detail-view/side-bar", () => ({tabType: "info"}), true)

    const tabType = toRef(storage, "tabType")

    useInterceptedKey(["Meta+Digit1", "Meta+Digit2", "Meta+Digit3"], e => {
        if(e.key === "Digit1") tabType.value = "info"
        else if(e.key === "Digit2") tabType.value = "related"
        else if(e.key === "Digit3") tabType.value = "source"
    })

    installDetailInfoLazyEndpoint({
        path,
        get: client => client.illust.image.get,
        update: client => client.illust.image.update,
        eventFilter: c => event => event.eventType === "entity/illust/updated" && event.illustId === c.path && event.detailUpdated
    })

    installRelatedItemsLazyEndpoint({
        path,
        get: client => path => client.illust.image.relatedItems.get(path, {limit: 9}),
        update: client => client.illust.image.relatedItems.update,
        eventFilter: c => event => event.eventType === "entity/illust/related-items/updated" && event.illustId === c.path
    })

    installSourceDataLazyEndpoint({
        path,
        get: client => client.illust.image.sourceData.get,
        update: client => client.illust.image.sourceData.update,
        eventFilter: c => event => event.eventType === "entity/illust/source-data/updated" && event.illustId === c.path
    })

    return {tabType}
}

const [installDetailInfoLazyEndpoint, useDetailInfoLazyEndpoint] = createLazyFetchEndpoint<number, DetailIllust, ImageUpdateForm, never, IllustExceptions["image.update"], never>()
const [installRelatedItemsLazyEndpoint, useRelatedItemsLazyEndpoint] = createLazyFetchEndpoint<number, ImageRelatedItems, ImageRelatedUpdateForm, never, IllustExceptions["image.relatedItems.update"], never>()
const [installSourceDataLazyEndpoint, useSourceDataLazyEndpoint] = createLazyFetchEndpoint<number, ImageSourceData, ImageSourceDataUpdateForm, never, IllustExceptions["image.sourceData.update"], never>()

export function useSideBarDetailInfo() {
    const dialog = useDialogService()
    const { target: { id } } = useImageViewContext()
    const { data, setData } = useDetailInfoLazyEndpoint()

    const setDescription = async (description: string) => {
        return description === data.value?.description || await setData({ description })
    }
    const setScore = async (score: number | null) => {
        return score === data.value?.score || await setData({ score })
    }
    const setPartitionTime = async (partitionTime: LocalDateTime) => {
        return partitionTime.timestamp === data.value?.partitionTime?.timestamp || await setData({partitionTime})
    }
    const setOrderTime = async (orderTime: LocalDateTime) => {
        return orderTime.timestamp === data.value?.orderTime?.timestamp || await setData({orderTime})
    }
    const openMetaTagEditor = () => {
        if(id.value !== null) {
            dialog.metaTagEditor.editIdentity({type: "IMAGE", id: id.value})
        }
    }

    return {data, id, setDescription, setScore, setPartitionTime, setOrderTime, openMetaTagEditor}
}

export function useSideBarRelatedItems() {
    const viewStack = useViewStack()
    const navigator = useRouterNavigator()
    const dialog = useDialogService()
    const { target: { id } } = useImageViewContext()
    const { data } = useRelatedItemsLazyEndpoint()

    const openRelatedBook = (book: SimpleBook) => {
        viewStack.openBookView(book.id)
    }

    const openRelatedCollection = () => {
        const id = data.value?.collection?.id
        if(id !== undefined) {
            viewStack.openCollectionView(id)
        }
    }

    const openAssociate = () => {
        if(id.value !== null) {
            dialog.associateExplorer.openAssociateView(id.value)
        }
    }

    const openAssociateInNewView = (index?: number) => {
        if(data.value?.associates.length) {
            viewStack.openImageView({imageIds: data.value.associates.map(i => i.id), focusIndex: index})
        }
    }

    const openFolderInNewWindow = (folder: SimpleFolder) => {
        navigator.newWindow({routeName: "MainFolder", query: {detail: folder.id}})
    }

    return {data, openRelatedBook, openRelatedCollection, openAssociate, openAssociateInNewView, openFolderInNewWindow}
}

export function useSideBarSourceData() {
    const message = useMessageBox()
    const dialog = useDialogService()
    const { data, setData } = useSourceDataLazyEndpoint()

    useSettingSite()

    const sourceIdentity = computed(() => data.value !== null ? {site: data.value.sourceSite, sourceId: data.value.sourceId, sourcePart: data.value.sourcePart} : null)

    const setSourceIdentity = async (value: {site: string | null, sourceId: number | null, sourcePart: number | null}) => {
        return (value.site === data.value?.sourceSite && value.sourceId === data.value?.sourceId && value.sourcePart === data.value?.sourcePart) || await setData({sourceSite: value.site, sourceId: value.sourceId, sourcePart: value.sourcePart}, e => {
            if(e.code === "NOT_EXIST") {
                message.showOkMessage("error", `来源${value.site}不存在。`)
            }else if(e.code === "PARAM_ERROR") {
                const target = e.info === "sourceId" ? "来源ID" : e.info === "sourcePart" ? "分P" : e.info
                message.showOkMessage("error", `${target}的值内容错误。`, "ID只能是自然数。")
            }else if(e.code === "PARAM_REQUIRED") {
                const target = e.info === "sourceId" ? "来源ID" : e.info === "sourcePart" ? "分P" : e.info
                message.showOkMessage("error", `${target}属性缺失。`)
            }else if(e.code === "PARAM_NOT_REQUIRED") {
                if(e.info === "sourcePart") {
                    message.showOkMessage("error", `分P属性不需要填写，因为选择的来源类型不支持分P。`)
                }else if(e.info === "sourceId/sourcePart") {
                    message.showOkMessage("error", `来源ID/分P属性不需要填写，因为未指定来源类型。`)
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
        if(data.value !== null && data.value.sourceSite !== null) {
            dialog.sourceDataEditor.edit({sourceSite: data.value.sourceSite, sourceId: data.value.sourceId})
        }
    }

    return {data, sourceIdentity, setSourceIdentity, setSourceStatus, openSourceDataEditor}
}
