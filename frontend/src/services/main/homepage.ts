import { useViewStack } from "@/components-module/view-stack"
import { useFetchReactive } from "@/functions/fetch"
import { useTabRoute } from "@/modules/browser"
import { LocalDate } from "@/utils/datetime"
import { optionalInstallation } from "@/utils/reactivity"

export function useHomepageContext() {
    const router = useTabRoute()
    const viewStack = useViewStack()
    const { data, loading } = useFetchReactive({
        get: client => client.homepage.homepage,
        eventFilter: "app/homepage/info/updated"
    })

    const openPartition = (date: LocalDate) => {
        router.routePush({routeName: "PartitionDetail", path: date})
    }

    const openIllustOfPartition = (date: LocalDate, imageId: number) => {
        router.routePush({routeName: "PartitionDetail", path: date, initializer: {locateId: imageId}})
    }

    const openAuthorOrTopic = (type: "TOPIC" | "AUTHOR", name: string) => {
        router.routePush({routeName: "Illust", initializer: {authorName: type === "AUTHOR" ? name : undefined, topicName: type === "TOPIC" ? name : undefined}})
    }

    const openIllustOfAuthorOrTopic = (type: "TOPIC" | "AUTHOR", name: string, imageId: number) => {
        router.routePush({routeName: "Illust", initializer: {authorName: type === "AUTHOR" ? name : undefined, topicName: type === "TOPIC" ? name : undefined, locateId: imageId}})
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