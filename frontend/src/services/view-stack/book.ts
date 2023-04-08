import { computed, Ref, ref } from "vue"
import { Book } from "@/functions/http-client/api/book"
import { flatResponse } from "@/functions/http-client"
import { SingletonSlice, SliceOrPath, useFetchEndpoint, useSingletonDataView } from "@/functions/fetch"
import { installVirtualViewNavigation } from "@/components/data"
import { useDialogService } from "@/components-module/dialog"
import { useViewStack } from "@/components-module/view-stack"
import { useMessageBox } from "@/modules/message-box"
import { useListViewContext } from "@/services/base/list-view-context"
import { useSelectedState } from "@/services/base/selected-state"
import { useSelectedPaneState } from "@/services/base/selected-pane-state"
import { useIllustViewController } from "@/services/base/view-controller"
import { useImageDatasetOperators } from "@/services/common/illust"
import { installation } from "@/utils/reactivity"

export const [installBookViewContext, useBookViewContext] = installation(function (data: SliceOrPath<Book, SingletonSlice<Book>, number>) {
    const target = useTarget(data)
    const listview = useListView(target.id)
    const selector = useSelectedState({queryListview: listview.listview, keyOf: item => item.id})
    const paneState = useSelectedPaneState("illust", selector)
    const listviewController = useIllustViewController()
    const navigation = installVirtualViewNavigation()
    const operators = useImageDatasetOperators({
        paginationData: listview.paginationData,
        listview: listview.listview,
        selector, navigation,
        dataDrop: {dropInType: "book", path: target.id}
    })

    return {target, listview, selector, paneState, listviewController, operators}
})

function useId(data: SliceOrPath<Book, SingletonSlice<Book>, number>): Ref<number | null> {
    if(data.type === "slice") {
        const view = useSingletonDataView(data.slice).data
        return computed(() => view.value?.id ?? null)
    }else{
        return ref(data.path)
    }
}

function useTarget(slice: SliceOrPath<Book, SingletonSlice<Book>, number>) {
    const message = useMessageBox()
    const dialog = useDialogService()
    const { isClosable, closeView } = useViewStack()

    const id = useId(slice)

    const { data, setData, deleteData } = useFetchEndpoint({
        path: id,
        get: client => client.book.get,
        update: client => client.book.update,
        delete: client => client.book.delete,
        eventFilter: c => event => (event.eventType === "entity/book/updated" || event.eventType === "entity/book/deleted") && event.bookId === c.path,
        afterDelete() {
            //对象删除时，自动关闭视图
            if(isClosable()) {
                closeView()
            }
        }
    })

    const toggleFavorite = () => {
        setData({favorite: !data.value?.favorite}).finally()
    }

    const setTitle = async (title: string) => {
        return title === data.value?.title || await setData({ title })
    }

    const setDescription = async (description: string) => {
        return description === data.value?.description || await setData({ description })
    }

    const setScore = async (score: number | null) => {
        return score === data.value?.score || await setData({ score })
    }

    const deleteItem = async () => {
        if(await message.showYesNoMessage("warn", "确定要删除此项吗？", "此操作不可撤回。")) {
            await deleteData()
        }
    }

    const openMetaTagEditor = () => {
        if(id.value !== null) {
            dialog.metaTagEditor.editIdentity({type: "BOOK", id: id.value})
        }
    }

    return {data: data, id, toggleFavorite, setTitle, setDescription, setScore, deleteItem, openMetaTagEditor}
}

function useListView(path: Ref<number | null>) {
    return useListViewContext({
        filter: path,
        request: client => async (offset, limit, filter) => {
            if(filter === null) {
                return {ok: true, status: 200, data: {total: 0, result: []}}
            }
            return await client.book.images.get(filter, {offset, limit})
        },
        eventFilter: {
            filter: ["entity/illust/updated", "entity/illust/deleted", "entity/book-images/changed"],
            operation({ event, refresh, update, remove }) {
                if(event.eventType === "entity/illust/updated" && event.generalUpdated) {
                    update(i => i.id === event.illustId)
                }else if(event.eventType === "entity/illust/deleted") {
                    remove(i => i.id === event.illustId)
                }else if(event.eventType === "entity/book-images/changed" && event.bookId === path.value) {
                    refresh()
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.illust.get(a.id))))
        }
    })
}
