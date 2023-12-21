import { Ref, watch } from "vue"
import { installation } from "@/utils/reactivity"
import { installVirtualViewNavigation } from "@/components/data"
import { Book, BookQueryFilter, DetailBook } from "@/functions/http-client/api/book"
import { flatResponse } from "@/functions/http-client"
import { useFetchEndpoint, useRetrieveHelper } from "@/functions/fetch"
import { useMessageBox } from "@/modules/message-box"
import { useRouterNavigator, useRouterParamEvent } from "@/modules/router"
import { useViewStack } from "@/components-module/view-stack"
import { useDialogService } from "@/components-module/dialog"
import { useListViewContext } from "@/services/base/list-view-context"
import { useQuerySchema } from "@/services/base/query-schema"
import { useBookViewController } from "@/services/base/view-controller"
import { useSelectedPaneState } from "@/services/base/selected-pane-state"
import { useSingleSelectedState } from "@/services/base/selected-state"

export const [installBookContext, useBookContext] = installation(function () {
    const querySchema = useQuerySchema("BOOK")
    const listview = useListView(querySchema.query)
    const listviewController = useBookViewController()
    const selector = useSingleSelectedState({queryListview: listview.listview, keyOf: i => i.id})
    const paneState = useSelectedPaneState("book")
    const operators = useOperators()

    installVirtualViewNavigation()

    useRouterParamEvent("MainBook", params => {
        if(params.tagName || params.authorName || params.topicName) {
            //监听router event。对于meta tag，将其简单地转换为DSL的一部分。
            //FUTURE 当然这其实是有问题的，对于topic/tag，还应该使用地址去限制它们。
            querySchema.queryInputText.value = [
                params.tagName ? `$\`${params.tagName}\`` : undefined,
                params.topicName ? `#\`${params.topicName}\`` : undefined,
                params.authorName ? `@\`${params.authorName}\`` : undefined
            ].filter(i => i !== undefined).join(" ")
        }
    })

    return {listview, querySchema, listviewController, selector, paneState, operators}
})

function useListView(query: Ref<string | undefined>) {
    const listview = useListViewContext({
        defaultFilter: <BookQueryFilter>{order: "-updateTime"},
        request: client => (offset, limit, filter) => client.book.list({offset, limit, ...filter}),
        keyOf: item => item.id,
        eventFilter: {
            filter: ["entity/book/created", "entity/book/updated", "entity/book/deleted", "entity/book/images/changed"],
            operation({ event, refresh, updateKey, removeKey }) {
                if(event.eventType === "entity/book/created") {
                    refresh()
                }else if((event.eventType === "entity/book/updated" && event.listUpdated) || event.eventType === "entity/book/images/changed") {
                    updateKey(event.bookId)
                }else if(event.eventType === "entity/book/deleted") {
                    removeKey(event.bookId)
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.book.get(a.id))))
        }
    })

    watch(query, query => listview.queryFilter.value.query = query, {immediate: true})

    return listview
}

function useOperators() {
    const messageBox = useMessageBox()
    const viewStack = useViewStack()
    const navigator = useRouterNavigator()
    const dialog = useDialogService()

    const retrieveHelper = useRetrieveHelper({
        update: client => client.book.update,
        delete: client => client.book.delete
    })

    const openBookView = (book: Book) => {
        viewStack.openBookView(book.id)
    }

    const openInNewWindow = (book: Book) => {
        navigator.newPreviewWindow({type: "book", bookId: book.id})
    }

    const exportItem = (book: Book) => {
        dialog.externalExporter.export("BOOK", book)
    }

    const switchFavorite = async (book: Book, favorite: boolean) => {
        await retrieveHelper.setData(book.id, {favorite})
    }

    const deleteItem = async (book: Book) => {
        if(await messageBox.showYesNoMessage("warn", "确定要删除此画集吗？画集内的图像不会被删除。", "此操作不可撤回。")) {
            await retrieveHelper.deleteData(book.id)
        }
    }

    return {switchFavorite, deleteItem, openBookView, openInNewWindow, exportItem}
}

export function useBookDetailPane() {
    const { selector } = useBookContext()

    const { data } = useFetchEndpoint({
        path: selector.selected,
        get: client => client.book.get,
        eventFilter: c => event => ((event.eventType === "entity/book/updated" && event.detailUpdated) || event.eventType === "entity/book/deleted") && event.bookId === c.path,
    })

    return {data}
}

export function useSideBarDetailInfo(data: Ref<DetailBook | null>) {
    const dialog = useDialogService()

    const { setData } = useRetrieveHelper({
        update: client => client.book.update
    })

    const setTitle = async (title: string) => {
        return title === data.value?.title || await setData(data.value!.id, { title })
    }

    const setDescription = async (description: string) => {
        return description === data.value?.description || await setData(data.value!.id, { description })
    }

    const setScore = async (score: number | null) => {
        return score === data.value?.score || await setData(data.value!.id, { score })
    }

    const openMetaTagEditor = () => {
        if(data.value !== null) {
            dialog.metaTagEditor.editIdentity({type: "BOOK", id: data.value.id})
        }
    }

    return {data, setTitle, setDescription, setScore, openMetaTagEditor}
}