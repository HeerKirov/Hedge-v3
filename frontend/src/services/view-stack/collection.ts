import { Ref, ref } from "vue"
import { Illust } from "@/functions/http-client/api/illust"
import { mapResponse } from "@/functions/http-client"
import {
    SingletonSlice, SliceOrPath, SingletonDataView,
    useFetchEndpoint, useSingletonDataView, usePostPathFetchHelper, usePostFetchHelper, useFetchEvent 
} from "@/functions/fetch"
import { useLocalStorage } from "@/functions/app"
import { installVirtualViewNavigation } from "@/components/data"
import { useViewStack } from "@/components-module/view-stack"
import { useMessageBox } from "@/modules/message-box"
import { useInterceptedKey } from "@/modules/keyboard"
import { useListViewContext } from "@/services/base/list-view-context"
import { useSelectedState } from "@/services/base/selected-state"
import { useSelectedPaneState } from "@/services/base/selected-pane-state"
import { useIllustViewController } from "@/services/base/view-controller"
import { installIllustListviewContext, useImageDatasetOperators } from "@/services/common/illust"
import { useSettingSite } from "@/services/setting"
import { computedEffect, installation, toRef } from "@/utils/reactivity"

export const [installCollectionViewContext, useCollectionViewContext] = installation(function (data: SliceOrPath<Illust, SingletonSlice<Illust>, number>) {
    const singleton = useSingleton(data)
    const target = useTarget(singleton)
    const listview = useListView(target.id)
    const selector = useSelectedState({queryListview: listview.listview, keyOf: item => item.id})
    const paneState = useSelectedPaneState("illust")
    const listviewController = useIllustViewController()
    const navigation = installVirtualViewNavigation()
    const operators = useImageDatasetOperators({
        paginationData: listview.paginationData,
        listview: listview.listview,
        listviewController, selector, navigation,
        dataDrop: {dropInType: "collection", path: target.id}
    })

    const sideBar = useSideBarContext()

    installIllustListviewContext({listview, selector, listviewController})

    useSettingSite()

    useViewStackCallback(singleton)

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

    const id = computedEffect(() => singleton.data.value?.id ?? null)

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
            filter: ["entity/illust/updated", "entity/illust/deleted", "entity/illust/images/changed"],
            operation({ event, refresh, updateOne, removeOne }) {
                if((event.eventType === "entity/illust/images/changed" && event.illustId === path.value) || (event.eventType === "entity/illust/updated" && event.illustType === "IMAGE" && event.timeSot)) {
                    refresh()
                }else if(event.eventType === "entity/illust/updated" && event.listUpdated && event.illustType === "IMAGE") {
                    updateOne(i => i.id === event.illustId)
                }else if(event.eventType === "entity/illust/deleted") {
                    removeOne(i => i.id === event.illustId)
                }
            },
            request: client => async items => mapResponse(await client.illust.findByIds(items.map(i => i.id)), r => r.map(i => i !== null ? i : undefined))
        }
    })
}

function useViewStackCallback(singleton: SingletonDataView<Illust>) {
    const { isClosable, closeView } = useViewStack()

    useFetchEvent({
        filter: ["entity/illust/deleted"],
        operation(context) {
            if(context.event.eventType === "entity/illust/deleted" && context.event.illustId === singleton.data.value?.id && isClosable()) {
                closeView()
            }
        }
    })
}

function useSideBarContext() {
    const storage = useLocalStorage<{tabType: "info"| "related"}>("collection-detail-view/side-bar", () => ({tabType: "info"}), true)

    const tabType = toRef(storage, "tabType")

    //由于Meta+N快捷键可能被Illust列表的侧边栏占用，因此此处提供了一个Meta+Shift+N的快捷键
    useInterceptedKey(["Meta+Digit1", "Meta+Digit2", "Meta+Shift+Digit1", "Meta+Shift+Digit2"], e => {
        if(e.key === "Digit1") tabType.value = "info"
        else if(e.key === "Digit2") tabType.value = "related"
    })

    return {tabType}
}
