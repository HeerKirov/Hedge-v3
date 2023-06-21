import { useViewStack } from "@/components-module/view-stack"
import { useFetchReactive } from "@/functions/fetch"
import { useRouterNavigator } from "@/modules/router"
import { LocalDate } from "@/utils/datetime"

export function useHomepageContext() {
    const viewStack = useViewStack()
    const navigator = useRouterNavigator()
    const { data, loading } = useFetchReactive({
        get: client => client.homepage.homepage
    })

    const openIllustOfRecent = (imageId: number) => {
        //FUTURE: 存在一个小问题，recent列表的排序方式是-createTime，但illust的默认排序是-orderTime，有时可能造成过于远的查询
        navigator.goto({routeName: "MainIllust", params: {locateId: imageId}})
    }

    const openPartition = (date: LocalDate) => {
        navigator.goto({routeName: "MainPartition", query: {detail: date}})
    }

    const openIllustOfPartition = (date: LocalDate, imageId: number) => {
        navigator.goto({routeName: "MainPartition", query: {detail: date}, params: {locateId: imageId}})
    }

    const openAuthorOrTopic = (type: "TOPIC" | "AUTHOR", name: string) => {
        navigator.goto({routeName: "MainIllust", params: {authorName: type === "AUTHOR" ? name : undefined, topicName: type === "TOPIC" ? name : undefined}})
    }

    const openIllustOfAuthorOrTopic = (type: "TOPIC" | "AUTHOR", name: string, imageId: number) => {
        navigator.goto({routeName: "MainIllust", params: {authorName: type === "AUTHOR" ? name : undefined, topicName: type === "TOPIC" ? name : undefined, locateId: imageId}})
    }

    const openBook = (bookId: number) => {
        viewStack.openBookView(bookId)
    }

    return {data, loading, openPartition, openIllustOfPartition, openBook, openAuthorOrTopic, openIllustOfAuthorOrTopic, openIllustOfRecent}
}