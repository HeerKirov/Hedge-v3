import { computed, onUnmounted, Ref, ref, watch } from "vue"
import { Illust } from "@/functions/http-client/api/illust"
import { flatResponse, mapResponse } from "@/functions/http-client"
import {
    AllSlice, ListIndexSlice, SliceDataView, SliceOrPath,
    useFetchListEndpoint, useFetchSinglePathEndpoint,
    usePostFetchHelper, usePostPathFetchHelper,
    useSliceDataView, useSliceDataViewByRef, useFetchReactive
} from "@/functions/fetch"
import { useAssets, useLocalStorage } from "@/functions/app"
import { useDialogService } from "@/components-module/dialog"
import { useGlobalKey, useInterceptedKey } from "@/modules/keyboard"
import { useToast } from "@/modules/toast"
import { useMessageBox } from "@/modules/message-box"
import { openLocalFile, openLocalFileInFolder } from "@/modules/others"
import { toRef } from "@/utils/reactivity"
import { useStackedView } from "./context"

export function useImageViewContext(data: SliceOrPath<Illust, number, AllSlice<Illust, number> | ListIndexSlice<Illust, number>, number[]>, modifiedCallback?: (illustId: number) => void) {
    const slice = useSlice(data)
    const subSlice = useSubSlice(slice)
    const navigator = useNavigator(slice, subSlice)
    const target = useTarget(slice, subSlice)
    const operators = useOperators(target.data, target.id)

    useViewStackCallback(slice, modifiedCallback)

    const sideBar = useSideBarContext()
    const playBoard = usePlayBoardContext()

    return {navigator, target, operators, sideBar, playBoard}
}

function useSlice(data: SliceOrPath<Illust, number, AllSlice<Illust, number> | ListIndexSlice<Illust, number>, number[]>): SliceDataView<Illust> {
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
            request: client => async items => flatResponse(await Promise.all(items.map(i => client.illust.getSimple(i.id))))
        }
    })

    //根据slice currentIndex的变更调整方向
    watch(slice.currentIndex, (sliceIndex, oldSliceIndex) => {
        //tips: 当首尾循环时，使用大小比较的判定方式就不正确了。不过现在的实现方式也并非100%正确，因为首尾循环还会存在SHIFT一次跨5项的情况，但考虑到使用较少以及改动较大就使用以下方式简单实现了
        if(sliceIndex === 0) {
            defaultLocation.value = "first"
        }else if(slice.count.value !== null && sliceIndex === slice.count.value - 1) {
            defaultLocation.value = "last"
        }else if(sliceIndex > oldSliceIndex) {
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
        const targetIndex = slice.currentIndex.value - count
        if(targetIndex >= 0) {
            slice.currentIndex.value = targetIndex
        }else if(slice.count.value !== null) {
            slice.currentIndex.value = slice.count.value + targetIndex
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
        if(slice.count.value !== null) {
            const targetIndex = slice.currentIndex.value + count
            if(targetIndex < slice.count.value) {
                slice.currentIndex.value = targetIndex
            }else{
                slice.currentIndex.value = targetIndex - slice.count.value
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
    const stackedView = useStackedView()
    const { assetsLocal } = useAssets()

    const fetchSetData = usePostPathFetchHelper(client => client.illust.image.update)
    const fetchDeleteData = usePostPathFetchHelper(client => client.illust.image.delete)
    const fetchStagingPostUpdate = usePostFetchHelper(client => client.stagingPost.update)

    const toggleFavorite = () => {
        if(data.value !== null) {
            fetchSetData(data.value.id, {favorite: !data.value.favorite}).finally()
        }
    }

    const deleteItem = async () => {
        if(id.value !== null) {
            const res = await message.showCheckBoxMessage("warn", "确定要删除此项吗？", "被删除的项将放入「已删除」归档。", [{key: "SHIFT", name: "彻底删除图像"}])
            if(res.ok) await fetchDeleteData(id.value, {deleteCompletely: res.checks.includes("SHIFT")})
        }
    }

    const openInNewWindow = () => {
        stackedView.openImageViewInNewWindow({imageIds: [id.value!]})
    }

    const editMetaTag = () => {
        if(id.value !== null) {
            dialog.metaTagEditor.editIdentity({type: "IMAGE", id: id.value})
        }
    }

    const editSourceData = () => {
        if(data.value !== null && data.value.source !== null) {
            dialog.sourceDataEditor.edit({sourceSite: data.value.source.sourceSite, sourceId: data.value.source.sourceId})
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

    const openInLocalPreference = async () => {
        if(data.value !== null) {
            openLocalFile(await assetsLocal(data.value.filePath.original))
        }
    }

    const openInLocalFolder = async () => {
        if(data.value !== null) {
            openLocalFileInFolder(await assetsLocal(data.value.filePath.original))
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
    const { isRootView, closeView } = useStackedView()

    //列表清空时，自动关闭视图
    watch(slice.count, cnt => {
        if(cnt !== null && cnt <= 0 && !isRootView) {
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

function useSideBarContext() {
    const storage = useLocalStorage<{collapsed: boolean}>("image-detail-view/side-bar", () => ({collapsed: false}), true)

    const collapsed = toRef(storage, "collapsed")

    useInterceptedKey("Meta+KeyP", () => collapsed.value = !collapsed.value)

    return {collapsed}
}
