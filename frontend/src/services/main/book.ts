import { installation, toRef } from "@/utils/reactivity"
import { installVirtualViewNavigation } from "@/components/data"
import { Book, BookQueryFilter } from "@/functions/http-client/api/book"
import { flatResponse } from "@/functions/http-client"
import { useRetrieveHelper } from "@/functions/fetch"
import { useMessageBox } from "@/modules/message-box"
import { useRouterNavigator } from "@/modules/router"
import { useViewStack } from "@/components-module/view-stack"
import { useDialogService } from "@/components-module/dialog"
import { useListViewContext } from "@/services/base/list-view-context"
import { useQuerySchema } from "@/services/base/query-schema"
import { useBookViewController } from "@/services/base/view-controller"

export const [installBookContext] = installation(function () {
    const listview = useListView()
    const querySchema = useQuerySchema("BOOK", toRef(listview.queryFilter, "query"))
    const listviewController = useBookViewController()
    const operators = useOperators()

    installVirtualViewNavigation()

    return {listview, querySchema, listviewController, operators}
})

function useListView() {
    return useListViewContext({
        defaultFilter: <BookQueryFilter>{order: "-updateTime"},
        request: client => (offset, limit, filter) => client.book.list({offset, limit, ...filter}),
        eventFilter: {
            filter: ["entity/book/created", "entity/book/updated", "entity/book/deleted", "entity/book-images/changed"],
            operation({ event, refresh, update, remove }) {
                if(event.eventType === "entity/book/created") {
                    refresh()
                }else if((event.eventType === "entity/book/updated" && event.generalUpdated) || event.eventType === "entity/book-images/changed") {
                    update(i => i.id === event.bookId)
                }else if(event.eventType === "entity/book/deleted") {
                    remove(i => i.id === event.bookId)
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.book.get(a.id))))
        }
    })
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
        navigator.newWindow({routeName: "Preview", params: {type: "book", bookId: book.id}})
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
