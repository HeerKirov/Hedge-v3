import { useFetchReactive } from "@/functions/fetch"
import { mapResponse } from "@/functions/http-client"
import { BackgroundTask, BackgroundTaskType } from "@/functions/http-client/api/homepage"
import { useTabRoute } from "@/modules/browser"
import { LocalDate } from "@/utils/datetime"
import { optionalInstallation } from "@/utils/reactivity"

export function useHomepageContext() {
    const router = useTabRoute()
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
        router.routePush({routeName: "BookDetail", path: bookId})
    }

    return {data, loading, openPartition, openIllustOfPartition, openBook, openAuthorOrTopic, openIllustOfAuthorOrTopic}
}

export const [installHomepageState, useHomepageState] = optionalInstallation(function() {
    const { data } = useFetchReactive({
        get: client => client.homepage.state,
        eventFilter: "app/homepage/state/changed"
    })

    const { data: backgroundTasks } = useFetchReactive({
        get: client => async () => {
            const res = await client.homepage.backgroundTasks()
            return mapResponse(res, r => r.filter(t => t.currentValue < t.maxValue))
        },
        eventFilter: "app/background-task/changed",
        eventUpdater(events, old) {
            const li = old ?? []
            //将events中的所有变更合并
            const accessedKey = new Set<BackgroundTaskType>()
            const filteredEvents: BackgroundTask[] = []
            for(const { event } of events.toReversed()) {
                if(event.eventType === "app/background-task/changed") {
                    if(!accessedKey.has(event.type)) {
                        accessedKey.add(event.type)
                        filteredEvents.unshift(event)
                    }
                }
            }
            for(const task of filteredEvents.toReversed()) {
                const idx = li.findIndex(i => i.type === task.type)
                if(idx >= 0) {
                    li.splice(idx, 1, task)
                }else{
                    li.push(task)
                }
            }
            return li
        },
    })

    return {data, backgroundTasks}
})