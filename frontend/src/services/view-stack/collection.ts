import { computed, Ref, ref } from "vue"
import {
    CollectionRelatedItems, CollectionRelatedUpdateForm, CollectionUpdateForm,
    DetailIllust, Illust, IllustExceptions
} from "@/functions/http-client/api/illust"
import { flatResponse } from "@/functions/http-client"
import {
    SingletonSlice, SliceOrPath, SingletonDataView,
    createLazyFetchEndpoint, useFetchEndpoint, useSingletonDataView, usePostPathFetchHelper, usePostFetchHelper
} from "@/functions/fetch"
import { useLocalStorage } from "@/functions/app"
import { installVirtualViewNavigation } from "@/components/data"
import { useDialogService } from "@/components-module/dialog"
import { useMessageBox } from "@/modules/message-box"
import { useListViewContext } from "@/services/base/list-view-context"
import { useSelectedState } from "@/services/base/selected-state"
import { useSelectedPaneState } from "@/services/base/selected-pane-state"
import { useIllustViewController } from "@/services/base/view-controller"
import { useImageDatasetOperators } from "@/services/common/illust"
import { useSettingSite } from "@/services/setting"
import { installation, toRef } from "@/utils/reactivity"

export const [installCollectionViewContext, useCollectionViewContext] = installation(function (data: SliceOrPath<Illust, SingletonSlice<Illust>, number>) {
    const singleton = useSingleton(data)
    const target = useTarget(singleton)
    const listview = useListView(target.id)
    const selector = useSelectedState({queryListview: listview.listview, keyOf: item => item.id})
    const paneState = useSelectedPaneState("illust", selector)
    const listviewController = useIllustViewController()
    const navigation = installVirtualViewNavigation()
    const operators = useImageDatasetOperators({
        paginationData: listview.paginationData,
        listview: listview.listview,
        selector, navigation,
        dataDrop: {dropInType: "collection", path: target.id}
    })

    const sideBar = useSideBarContext(target.id)

    useSettingSite()

    return {target, sideBar, listview, selector, paneState, listviewController, operators}
})

function useSingleton(data: SliceOrPath<Illust, SingletonSlice<Illust>, number>) {
    if(data.type === "slice") {
        return useSingletonDataView(data.slice)
    }else{
        return useFetchEndpoint({
            path: ref(data.path),
            get: client => client.illust.collection.get,
            eventFilter: c => event => (event.eventType === "entity/illust/updated" || event.eventType === "entity/illust/deleted") && event.illustId === c.path
        })
    }
}

function useTarget(singleton: SingletonDataView<Illust>) {
    const message = useMessageBox()

    const id = computed(() => singleton.data.value?.id ?? null)

    const setData = usePostPathFetchHelper(client => client.illust.collection.update)

    const deleteData = usePostFetchHelper(client => client.illust.collection.delete)

    const toggleFavorite = () => {
        if(singleton.data.value !== null) {
            setData(singleton.data.value.id, {favorite: !singleton.data.value.favorite}).finally()
        }
    }

    const deleteItem = async () => {
        if(id.value !== null && await message.showYesNoMessage("warn", "确定要删除此项吗？", "此操作不可撤回。")) {
            await deleteData(id.value)
        }
    }

    return {data: singleton.data, id, toggleFavorite, deleteItem}
}

function useListView(path: Ref<number | null>) {
    return useListViewContext({
        filter: path,
        request: client => async (offset, limit, filter) => {
            if(filter === null) {
                return {ok: true, status: 200, data: {total: 0, result: []}}
            }
            return await client.illust.collection.images.get(filter, {offset, limit})
        },
        eventFilter: {
            filter: ["entity/illust/updated", "entity/illust/deleted", "entity/collection-images/changed"],
            operation({ event, refresh, update, remove }) {
                if(event.eventType === "entity/illust/updated" && event.generalUpdated) {
                    update(i => i.id === event.illustId)
                }else if(event.eventType === "entity/illust/deleted") {
                    remove(i => i.id === event.illustId)
                }else if(event.eventType === "entity/collection-images/changed" && event.illustId === path.value) {
                    refresh()
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.illust.get(a.id))))
        }
    })
}

function useSideBarContext(path: Ref<number | null>) {
    const storage = useLocalStorage<{tabType: "info"| "related"}>("collection-detail-view/side-bar", () => ({tabType: "info"}), true)

    const tabType = toRef(storage, "tabType")

    installDetailInfoLazyEndpoint({
        path,
        get: client => client.illust.collection.get,
        update: client => client.illust.collection.update,
        eventFilter: c => event => event.eventType === "entity/illust/updated" && event.illustId === c.path && (event.generalUpdated || event.metaTagUpdated)
    })

    installRelatedItemsLazyEndpoint({
        path,
        get: client => path => client.illust.collection.relatedItems.get(path, {limit: 9}),
        update: client => client.illust.collection.relatedItems.update,
        eventFilter: c => event => event.eventType === "entity/illust/updated" && event.illustId === c.path && event.relatedItemsUpdated
    })

    return {tabType}
}

const [installDetailInfoLazyEndpoint, useDetailInfoLazyEndpoint] = createLazyFetchEndpoint<number, DetailIllust, CollectionUpdateForm, never, IllustExceptions["collection.update"], never>()
const [installRelatedItemsLazyEndpoint, useRelatedItemsLazyEndpoint] = createLazyFetchEndpoint<number, CollectionRelatedItems, CollectionRelatedUpdateForm, never, IllustExceptions["collection.relatedItems.update"], never>()

export function useSideBarDetailInfo() {
    const dialog = useDialogService()
    const { target: { id } } = useCollectionViewContext()
    const { data, setData } = useDetailInfoLazyEndpoint()

    const setDescription = async (description: string) => {
        return description === data.value?.description || await setData({ description })
    }
    const setScore = async (score: number | null) => {
        return score === data.value?.score || await setData({ score })
    }
    const openMetaTagEditor = () => {
        if(id.value !== null) {
            dialog.metaTagEditor.editIdentity({type: "COLLECTION", id: id.value})
        }
    }

    return {data, id, setDescription, setScore, openMetaTagEditor}
}

export function useSideBarRelatedItems() {
    const { data } = useRelatedItemsLazyEndpoint()

    const openAssociate = () => {
        //TODO relatedItems: 查看关联组
    }

    return {data, openAssociate}
}
