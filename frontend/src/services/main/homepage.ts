import { useViewStack } from "@/components-module/view-stack"
import { useFetchReactive } from "@/functions/fetch"
import { useRouterNavigator } from "@/modules/router"
import { LocalDate } from "@/utils/datetime"
import { optionalInstallation } from "@/utils/reactivity"

export function useHomepageContext() {
    const viewStack = useViewStack()
    const navigator = useRouterNavigator()
    const { data, loading } = useFetchReactive({
        get: client => client.homepage.homepage,
        eventFilter: "app/homepage/info/updated"
    })

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

    return {data, loading, openPartition, openIllustOfPartition, openBook, openAuthorOrTopic, openIllustOfAuthorOrTopic}
}

export const [installHomepageState, useHomepageState] = optionalInstallation(function() {
    const { data, loading } = useFetchReactive({
        get: client => client.homepage.state,
        eventFilter: "app/homepage/state/changed"
    })

    return {data, loading}
})