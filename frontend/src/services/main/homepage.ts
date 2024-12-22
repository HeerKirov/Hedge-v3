import { computed, onMounted, ref } from "vue"
import { useFetchHelper, useFetchReactive, usePostFetchHelper } from "@/functions/fetch"
import { mapResponse } from "@/functions/http-client"
import { BackgroundTask, BackgroundTaskType, HomepageRes } from "@/functions/http-client/api/homepage"
import { useRouteStorage } from "@/functions/app"
import { useMessageBox } from "@/modules/message-box"
import { useTabRoute } from "@/modules/browser"
import { LocalDate } from "@/utils/datetime"
import { optionalInstallation } from "@/utils/reactivity"

export function useHomepageContext() {
    const router = useTabRoute()
    const message = useMessageBox()
    const fetch = useFetchHelper(client => client.homepage.homepage)
    const fetchReset = usePostFetchHelper(client => client.homepage.resetHomepage)

    const data = useRouteStorage<HomepageRes[]>("homepage/data", [])
    const scrollPosition = useRouteStorage<number | null>("homepage/scroll-position")

    const loading = ref(false)
    const hasNext = computed(() => data.value.length < 10 && (data.value.length <= 0 || data.value[data.value.length - 1].illusts.length > 0))

    const scrollRef = ref<HTMLDivElement>()

    onMounted(async () => {
        if(data.value.length === 0) {
            const ok = await loadPageNum(0)
            if(ok) await loadPageNum(1)
        }
        if(scrollRef.value !== undefined && scrollPosition.value !== null) {
            scrollRef.value.scrollTo({behavior: "instant", top: scrollPosition.value})
        }
    })

    const loadPageNum = async (page: number): Promise<boolean> => {
        loading.value = true
        const res = await fetch({page})
        loading.value = false
        if(res !== undefined) {
            data.value[page] = res
            return res.illusts.length > 0
        }
        return false
    }

    const next = async () => {
        if(hasNext.value && !loading.value) {
            await loadPageNum(data.value.length)
        }
    }

    const scroll = (e: Event) => {
        const div = e.target as HTMLDivElement
        if(scrollPosition.value === null || Math.abs(scrollPosition.value - div.scrollTop) >= 16) scrollPosition.value = div.scrollTop
        if (hasNext.value && !loading.value && div.scrollTop + div.clientHeight >= div.scrollHeight - 4) {
            loadPageNum(data.value.length).finally()
        }
    }

    const reset = async () => {
        if(await message.showYesNoMessage("confirm", "确认要重新生成推荐内容吗？")) {
            if(await fetchReset({})) {
                data.value = []
                loading.value = false
                scrollPosition.value = null
                const ok = await loadPageNum(0)
                if(ok) await loadPageNum(1)
            }
        }
    }

    const openImport = () => {
        router.routePush({routeName: "Import"})
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

    return {data, loading, hasNext, next, scroll, reset, scrollRef, openImport, openIllustOfPartition, openBook, openAuthorOrTopic, openIllustOfAuthorOrTopic}
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