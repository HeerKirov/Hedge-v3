import { computed, nextTick, ref, watch } from "vue"
import { installVirtualViewNavigation } from "@/components/data"
import { PartitionMonth } from "@/functions/http-client/api/partition"
import { IllustQueryFilter } from "@/functions/http-client/api/illust"
import { flatResponse } from "@/functions/http-client"
import { useFetchEndpoint, useFetchReactive } from "@/functions/fetch"
import { useLocalStorage } from "@/functions/app"
import { useRouterQueryLocalDate } from "@/modules/router"
import { useNavHistoryPush } from "@/services/base/side-nav-menu"
import { useQuerySchema } from "@/services/base/query-schema"
import { useIllustViewController } from "@/services/base/view-controller"
import { useListViewContext } from "@/services/base/list-view-context"
import { useSelectedState } from "@/services/base/selected-state"
import { useSelectedPaneState } from "@/services/base/selected-pane-state"
import { useImageDatasetOperators } from "@/services/common/illust"
import { useSettingSite } from "@/services/setting"
import { installation } from "@/utils/reactivity"
import { sleep } from "@/utils/process"
import { arrays } from "@/utils/primitives"
import { date, datetime, getDaysOfMonth } from "@/utils/datetime"

export const [installPartitionContext, usePartitionContext] = installation(function () {
    const partition = usePartition()
    const querySchema = useQuerySchema("ILLUST")
    const listviewController = useIllustViewController()

    return {partition, querySchema, listviewController}
})

function usePartition() {
    const viewMode = useLocalStorage<"calendar" | "timeline">("partition/list/view-mode", "calendar")

    const today = datetime.now()

    const calendarDate = ref<YearAndMonth>({year: today.year, month: today.month})

    const path = useRouterQueryLocalDate("MainPartition", "detail")

    useNavHistoryPush(path, p => {
        const d = date.toISOString(p)
        return {id: d, name: d}
    })

    return {viewMode, calendarDate, path, today}
}

export function useCalendarContext() {
    const WEEKDAY_SPACE_COUNT = [6, 0, 1, 2, 3, 4, 5]

    const { partition: { calendarDate, path, today }, listviewController, querySchema } = usePartitionContext()

    const days = computed<(number | null)[]>(() => {
        const date = new Date(calendarDate.value.year, calendarDate.value.month - 1, 1)
        const spaceList = Array<number | null>(WEEKDAY_SPACE_COUNT[date.getDay()]).fill(null)
        const valueList = arrays.newArray(getDaysOfMonth(calendarDate.value.year, calendarDate.value.month), i => i + 1)
        return [...spaceList, ...valueList]
    })

    const { data, refreshData } = useFetchEndpoint({
        path: calendarDate,
        get: client => d => {
            const gte = date.ofDate(d.year, d.month, 1)
            const lt = d.month === 12 ? date.ofDate(d.year + 1, 1, 1) : date.ofDate(d.year, d.month + 1, 1)
            return client.partition.list({gte, lt, type: listviewController.collectionMode.value ? "COLLECTION" : "IMAGE", query: querySchema.query.value})
        }
    })

    watch([listviewController.collectionMode, querySchema.query], refreshData)

    const items = ref<({day: number, count: number | null, today: boolean} | null)[]>([])

    watch(data, partitions => {
        const thisMonth = today.year === calendarDate.value.year && today.month === calendarDate.value.month
        if(partitions !== null) {
            const daysCount: Record<number, number> = {}
            for (const { date, count } of partitions) {
                daysCount[date.day] = count
            }
            items.value = days.value.map(day => day ? {day, count: daysCount[day], today: thisMonth && today.day === day} : null)
        }else{
            items.value = days.value.map(day => day ? {day, count: null, today: thisMonth && today.day === day} : null)
        }
    })

    const openPartition = ({ day, count }: {day: number, count: number | null}) => {
        if(count) {
            path.value = date.ofDate(calendarDate.value.year, calendarDate.value.month, day)
        }
    }

    return {items, openPartition, calendarDate}
}

export function useTimelineContext() {
    const { partition: { calendarDate, path }, listviewController, querySchema } = usePartitionContext()

    const { data, refresh } = useFetchReactive({
        get: client => () => client.partition.list({type: listviewController.collectionMode.value ? "COLLECTION" : "IMAGE", query: querySchema.query.value})
    })

    watch([listviewController.collectionMode, querySchema.query], refresh)

    watch(data, data => {
        //根据data数据总集，生成月份列表，并将数据按月份划分成组
        if(data !== undefined) {
            const ret: {year: number, month: number, items: {day: number, count: number}[]}[] = []
            let current: {year: number, month: number, items: {day: number, count: number}[]} | null = null
            for (const partition of data) {
                if(current === null || partition.date.year !== current.year || partition.date.month !== current.month) {
                    current = {year: partition.date.year, month: partition.date.month, items: [{day: partition.date.day, count: partition.count}]}
                    ret.push(current)
                }else{
                    current.items.push({day: partition.date.day, count: partition.count})
                }
            }
            partitionData.value = ret
            partitionMonthData.value = ret.map(p => ({year: p.year, month: p.month, count: p.items.map(i => i.count).reduce((a, b) => a + b, 0), dayCount: p.items.length}))
        }else{
            partitionData.value = []
            partitionMonthData.value = []
        }
    })

    const partitionMonthData = ref<PartitionMonth[]>([])

    const partitionData = ref<{year: number, month: number, items: {day: number, count: number}[]}[]>([])

    const monthRefs: Record<`${number}-${number}`, HTMLDivElement> = {}
    const pmRefs: Record<`${number}-${number}`, HTMLDivElement> = {}

    watch(partitionMonthData, months => {
        //在当前选择月份不存在的情况下，滚动到存在数据的最后一个月份
        if(months.length > 0 && !months.find(p => p.year === calendarDate.value.year && p.month === calendarDate.value.month)) {
            const {year, month} = months[months.length - 1]
            calendarDate.value = {year, month}
        }
    })

    watch(calendarDate, async calendarDate => {
        //calendarDate变化后，被选中的项会发生变化，需要将目标项滚动到视野内
        const key = `${calendarDate.year}-${calendarDate.month}` as const
        enableScrollEvent = false
        monthRefs[key]?.scrollIntoView({behavior: "auto"})
        pmRefs[key]?.scrollIntoView({behavior: "auto"})
        await nextTick()
        enableScrollEvent = true
    })

    let enableScrollEvent: boolean = false

    const scrollEvent = (e: Event) => {
        if(enableScrollEvent) {
            const target = (e.target as HTMLDivElement)
            //计算当前可视范围的中线位置
            const rangeMid = target.scrollTop + target.offsetHeight / 2
            //首先检查现在的calendarDate是否在中线上
            const currentPmRef = pmRefs[`${calendarDate.value.year}-${calendarDate.value.month}`] as HTMLDivElement | undefined
            if(currentPmRef) {
                const elMin = currentPmRef.offsetTop, elMax = currentPmRef.offsetHeight + currentPmRef.offsetTop
                if(elMin < rangeMid && elMax > rangeMid) {
                    //当前pm仍在时跳过后续步骤
                    return
                }
            }
            for(const pm of Object.keys(pmRefs)) {
                const pmRef = pmRefs[pm as `${number}-${number}`] as HTMLDivElement
                const elMin = pmRef.offsetTop, elMax = pmRef.offsetHeight + pmRef.offsetTop
                if(elMin < rangeMid && elMax > rangeMid) {
                    //找到位于中线上的pm
                    const [y, m] = pm.split("-", 2)
                    calendarDate.value = {year: parseInt(y), month: parseInt(m)}
                    break
                }
            }
        }
    }

    const selectMonth = async (year: number, month: number)=> {
        if(calendarDate.value.year !== year || calendarDate.value.month !== month) {
            calendarDate.value = {year, month}

            enableScrollEvent = false
            const key = `${year}-${month}` as const
            pmRefs[key]?.scrollIntoView({behavior: "auto"})
            await sleep(100)
            enableScrollEvent = true
        }
    }

    const openPartition = (year: number, month: number, day: number) => {
        path.value = date.ofDate(year, month, day)
    }

    return {partitionMonthData, partitionData, monthRefs, pmRefs, calendarDate, selectMonth, scrollEvent, openPartition}
}

export function useDetailIllustContext() {
    const { querySchema, listviewController, partition: { path } } = usePartitionContext()
    const listview = useListView()
    const selector = useSelectedState({queryListview: listview.listview, keyOf: item => item.id})
    const paneState = useSelectedPaneState("illust", selector)
    const navigation = installVirtualViewNavigation()
    const operators = useImageDatasetOperators({
        paginationData: listview.paginationData,
        listview: listview.listview,
        selector, navigation
    })

    watch(listviewController.collectionMode, collectionMode => listview.queryFilter.value.type = collectionMode ? "COLLECTION" : "IMAGE", {immediate: true})
    watch(querySchema.query, query => listview.queryFilter.value.query = query, {immediate: true})
    watch(path, path => listview.queryFilter.value.partition = path ?? undefined, {immediate: true})

    useSettingSite()

    return {path, listview, selector, paneState, operators, querySchema, listviewController}
}

function useListView() {
    const listview = useListViewContext({
        defaultFilter: <IllustQueryFilter>{order: "-orderTime", type: "IMAGE"},
        request: client => (offset, limit, filter) => client.illust.list({offset, limit, ...filter}),
        eventFilter: {
            filter: ["entity/illust/created", "entity/illust/updated", "entity/illust/deleted", "entity/collection-images/changed"],
            operation({ event, refresh, update, remove }) {
                if(event.eventType === "entity/illust/created") {
                    refresh()
                }else if(event.eventType === "entity/illust/updated" && event.generalUpdated) {
                    update(i => i.id === event.illustId)
                }else if(event.eventType === "entity/illust/deleted") {
                    if(event.illustType === "COLLECTION") {
                        if(listview.queryFilter.value.type === "COLLECTION") {
                            refresh()
                        }
                    }else{
                        remove(i => i.id === event.illustId)
                    }
                }else if(event.eventType === "entity/collection-images/changed") {
                    if(listview.queryFilter.value.type === "COLLECTION") {
                        refresh()
                    }
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.illust.get(a.id))))
        }
    })
    return listview
}

interface YearAndMonth {
    year: number
    month: number
}