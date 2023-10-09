import { ComponentPublicInstance, Ref, computed, onMounted, ref, watch } from "vue"
import { installVirtualViewNavigation } from "@/components/data"
import { Partition } from "@/functions/http-client/api/partition"
import { IllustQueryFilter } from "@/functions/http-client/api/illust"
import { flatResponse } from "@/functions/http-client"
import { useFetchReactive } from "@/functions/fetch"
import { useLocalStorage, useMemoryStorage } from "@/functions/app"
import { useRouterParamEvent, useRouterQueryLocalDate } from "@/modules/router"
import { useNavHistoryPush } from "@/services/base/side-nav-menu"
import { useQuerySchema } from "@/services/base/query-schema"
import { IllustViewController, useIllustViewController } from "@/services/base/view-controller"
import { useListViewContext } from "@/services/base/list-view-context"
import { useSelectedState } from "@/services/base/selected-state"
import { useSelectedPaneState } from "@/services/base/selected-pane-state"
import { installIllustListviewContext, useImageDatasetOperators, useLocateId } from "@/services/common/illust"
import { useSettingSite } from "@/services/setting"
import { computedEffect, computedWatch, installation } from "@/utils/reactivity"
import { arrays, numbers } from "@/utils/primitives"
import { LocalDate, date, getDaysOfMonth } from "@/utils/datetime"

export const [installPartitionContext, usePartitionContext] = installation(function () {
    const querySchema = useQuerySchema("ILLUST")
    const listviewController = useIllustViewController()
    const partition = usePartitionView(listviewController, querySchema.query)
    const path = useRouterQueryLocalDate("MainPartition", "detail")

    useNavHistoryPush(path, p => {
        const d = date.toISOString(p)
        return {id: d, name: d}
    })

    return {partition, querySchema, listviewController, path}
})

function usePartitionView(listviewController: IllustViewController, query: Ref<string | undefined>) {
    const viewMode = useLocalStorage<"calendar" | "timeline">("partition/list/view-mode", "calendar")
    const calendarDate = useMemoryStorage<YearAndMonth>("partition/list/calendar-date")

    const { partitionMonths, partitions, total, maxCount, maxCountOfMonth } = usePartitionData(listviewController, query)

    watch(partitionMonths, months => {
        //在未设置calendarDate，或者当前月份列表中不存在现在的值时，将其重置为最后一个月份
        if(months !== undefined && months.length && (calendarDate.value === null || !months.some(m => m.year === calendarDate.value!.year && m.month === calendarDate.value!.month))) {
            calendarDate.value = {year: months[months.length - 1].year, month: months[months.length - 1].month}
        }
    })

    return {partitions, partitionMonths, total, maxCount, maxCountOfMonth, viewMode, calendarDate}
}

function usePartitionData(listviewController: IllustViewController, query: Ref<string | undefined>) {
    const { data: partitions, refresh } = useFetchReactive({
        get: client => () => client.partition.list({type: listviewController.collectionMode.value ? "COLLECTION" : "IMAGE", query: query.value})
    })

    watch([listviewController.collectionMode, query], refresh)

    const partitionMonths = computed(() => {
        if(partitions.value !== undefined) {
            const ret: (YearAndMonth & {days: Partition[]})[] = []
            let current: YearAndMonth & {days: Partition[]} | null = null
            for(const partition of partitions.value) {
                if(current === null || partition.date.year !== current.year || partition.date.month !== current.month) {
                    ret.push(current = {year: partition.date.year, month: partition.date.month, days: [partition]})
                }else{
                    current.days.push(partition)
                }
            }
            return ret.map(p => ({year: p.year, month: p.month, count: p.days.map(i => i.count).reduce((a, b) => a + b, 0), days: p.days}))
        }
        return undefined
    })

    const total = computedWatch(partitionMonths, partitionMonths => {
        if(partitionMonths !== undefined) {
            let count = 0, day = 0
            for(const pm of partitionMonths) count += pm.count, day += pm.days.length
            return {count, day}
        }
        return {count: 0, day: 0}
    })

    const maxCount = computedWatch(partitions, partitions => {
        let max = 100
        if(partitions !== undefined) for(const p of partitions) if(p.count > max) max = p.count
        return max
    })

    const maxCountOfMonth = computedWatch(partitionMonths, partitionMonths => {
        let maxCount = 800
        if(partitionMonths !== undefined) for(const pm of partitionMonths) if(pm.count > maxCount) maxCount = pm.count
        return maxCount
    })

    return {partitions, partitionMonths, total, maxCount, maxCountOfMonth}
}

export function useCalendarContext() {
    const today = date.now()
    const WEEKDAY_SPACE_COUNT = [6, 0, 1, 2, 3, 4, 5]

    const { partition: { calendarDate, partitionMonths, maxCount }, path } = usePartitionContext()

    const days = computedWatch(calendarDate, calendarDate => {
        if(calendarDate !== null) {
            const date = new Date(calendarDate.year, calendarDate.month - 1, 1)
            const spaceList = Array<number | null>(WEEKDAY_SPACE_COUNT[date.getDay()]).fill(null)
            const valueList = arrays.newArray(getDaysOfMonth(calendarDate.year, calendarDate.month), i => i + 1)
            return [...spaceList, ...valueList]
        }
        return []
    })

    const daysCount = computedEffect(() => {
        if(calendarDate.value !== null && partitionMonths.value !== undefined) {
            const pm = partitionMonths.value.find(pm => pm.year === calendarDate.value!.year && pm.month === calendarDate.value!.month)
            if(pm !== undefined) {
                const daysCount: number[] = new Array(31)
                for (const { date, count } of pm.days) daysCount[date.day] = count
                return daysCount
            }
        }
        return null
    })

    const items = computed(() => {
        const thisMonth = today.year === calendarDate.value?.year && today.month === calendarDate.value?.month
        return days.value.map(day => {
            if(day) {
                const count = daysCount.value?.[day] ?? null
                const level = count !== null ? Math.ceil(count * 10 / maxCount.value) : null
                return {day, count, level, today: thisMonth && today.day === day}
            }
            return null
        })
    })

    const openPartition = (item: {day: number, count: number | null}) => {
        if(calendarDate.value !== null && item.count) path.value = date.ofDate(calendarDate.value.year, calendarDate.value.month, item.day)
    }

    return {items, openPartition, calendarDate}
}

export function useTimelineContext() {
    const { partition: { calendarDate, partitions, partitionMonths, maxCount, maxCountOfMonth }, path } = usePartitionContext()

    const months = computed(() => partitionMonths.value?.map(pm => ({year: pm.year, month: pm.month, uniqueKey: pm.year * 12 + pm.month, dayCount: pm.days.length, count: pm.count, width: numbers.round2decimal(pm.count * 100 / maxCountOfMonth.value), level: Math.ceil(pm.count * 10 / maxCountOfMonth.value)})) ?? [])

    const days = computed(() => partitions.value?.map(p => ({date: p.date, count: p.count, width: numbers.round2decimal(p.count * 100 / maxCount.value), level: Math.ceil(p.count * 10 / maxCount.value)})) ?? [])

    const calendarDateMonths = computed(() => partitionMonths.value !== undefined && calendarDate.value !== null ? partitionMonths.value.find(pm => pm.year === calendarDate.value!.year && pm.month === calendarDate.value!.month) ?? null : null)

    let timelineRef: HTMLDivElement | null = null
    const monthRefs: Record<number, HTMLDivElement> = {}
    const dayRefs: Record<number, HTMLDivElement> = {}

    onMounted(() => {
        //在calendarDate变化时，重新聚焦month
        watch(calendarDate, async calendarDate => {
            if(calendarDate !== null) {
                monthRefs[calendarDate.year * 12 + calendarDate.month]?.scrollIntoView({behavior: "auto"})
            }
        }, {immediate: true, flush: "post"})

        //也重新聚焦day，但要复杂一些。如果目标月份在显示区域内，则什么也不做；如果在后面，则滚动到月份的最后一天以显示该月的全部日期；同理如果在前面则滚动到月份的第一天
        watch(calendarDateMonths, async partitionMonth => {
            if(partitionMonth !== null) {
                const positionOffset = getPositionOfMonth(partitionMonth.days)
                if(positionOffset > 0) {
                    dayRefs[partitionMonth.days[partitionMonth.days.length - 1].date.timestamp]?.scrollIntoView({behavior: "auto"})
                }else if(positionOffset < 0) {
                    dayRefs[partitionMonth.days[0].date.timestamp]?.scrollIntoView({behavior: "auto"})
                }
            }
        }, {immediate: true, flush: "post"})
    })

    const getPositionOfMonth = (days: Partition[]) => {
        if(timelineRef !== null) {
            const visibleTop = timelineRef.scrollTop, visibleBottom = timelineRef.scrollTop + timelineRef.clientHeight
            const firstRef = dayRefs[days[0].date.timestamp], lastRef = dayRefs[days[days.length - 1].date.timestamp]
            if(firstRef.offsetTop + firstRef.offsetHeight > visibleBottom) {
                return firstRef.offsetTop + firstRef.offsetHeight - visibleBottom
            }else if(lastRef.offsetTop < visibleTop) {
                return lastRef.offsetTop - visibleTop
            }else{
                return 0
            }
        }
        return 0
    }

    const scrollEvent = () => {
        if(timelineRef !== null && partitionMonths.value !== undefined && calendarDateMonths.value !== null) {
            //判断当前calendarDate是否还在视线内。如果已不在实现内，则沿着滚动方向寻找下一个在实现内的月份，并切换到此月份
            const positionOffset = getPositionOfMonth(calendarDateMonths.value.days)
            if(positionOffset > 0) {
                for(let i = partitionMonths.value.indexOf(calendarDateMonths.value) - 1; i >= 0; --i) {
                    const pm = partitionMonths.value[i]
                    if(getPositionOfMonth(pm.days) === 0) {
                        selectMonth(pm)
                        break
                    }
                }
            }else if(positionOffset < 0) {
                for(let i = partitionMonths.value.indexOf(calendarDateMonths.value) + 1; i < partitionMonths.value.length; ++i) {
                    const pm = partitionMonths.value[i]
                    if(getPositionOfMonth(pm.days) === 0) {
                        selectMonth(pm)
                        break
                    }
                }
            }
        }
    }

    const selectMonth = async (item: YearAndMonth) => {
        if(calendarDate.value === null || calendarDate.value.year !== item.year || calendarDate.value.month !== item.month) {
            calendarDate.value = {year: item.year, month: item.month}
        }
    }

    const openPartition = (date: LocalDate) => {
        if(calendarDate.value === null || calendarDate.value.year !== date.year || calendarDate.value.month !== date.month) {
            selectMonth({year: date.year, month: date.month})
        }
        path.value = date
    }

    const setTimelineRef = (el: Element | ComponentPublicInstance | null) => {
        timelineRef = el as HTMLDivElement
    }

    const setDayRef = (key: number, el: Element | ComponentPublicInstance | null) => {
        if(el instanceof Element) {
            dayRefs[key] = el as HTMLDivElement
        }else if(el === null || el === undefined) {
            delete dayRefs[key]
        }else{
            dayRefs[key] = el.$el
        }
    }

    const setMonthRef = (key: number, el: Element | ComponentPublicInstance | null) => {
        if(el instanceof Element) {
            monthRefs[key] = el as HTMLDivElement
        }else if(el === null || el === undefined) {
            delete monthRefs[key]
        }else{
            monthRefs[key] = el.$el
        }
    }

    return {months, days, calendarDate, selectMonth, scrollEvent, openPartition, setTimelineRef, setDayRef, setMonthRef}
}

export function useDetailIllustContext() {
    const { querySchema, listviewController, path } = usePartitionContext()
    const listview = useListView()
    const selector = useSelectedState({queryListview: listview.listview, keyOf: item => item.id})
    const paneState = useSelectedPaneState("illust")
    const navigation = installVirtualViewNavigation()
    const operators = useImageDatasetOperators({
        paginationData: listview.paginationData,
        listview: listview.listview,
        listviewController, selector, navigation,
        dataDrop: {dropInType: "partition", path}
    })
    const locateId = useLocateId({queryFilter: listview.queryFilter, paginationData: listview.paginationData, selector, navigation})

    watch(listviewController.collectionMode, collectionMode => listview.queryFilter.value.type = collectionMode ? "COLLECTION" : "IMAGE", {immediate: true})
    watch(querySchema.query, query => listview.queryFilter.value.query = query, {immediate: true})
    watch(path, path => listview.queryFilter.value.partition = path ?? undefined, {immediate: true})

    installIllustListviewContext({listview, selector, listviewController})

    useSettingSite()

    useRouterParamEvent("MainPartition", params => {
        locateId.catchLocateId(params.locateId)
    })

    return {path, listview, selector, paneState, operators, querySchema, listviewController}
}

function useListView() {
    const listview = useListViewContext({
        defaultFilter: <IllustQueryFilter>{order: "orderTime", type: "IMAGE"},
        request: client => (offset, limit, filter) => client.illust.list({offset, limit, ...filter}),
        eventFilter: {
            filter: ["entity/illust/created", "entity/illust/updated", "entity/illust/deleted", "entity/illust/images/changed"],
            operation({ event, refresh, updateOne, removeOne }) {
                if(event.eventType === "entity/illust/created" || (event.eventType === "entity/illust/updated" && event.timeSot)) {
                    refresh()
                }else if(event.eventType === "entity/illust/updated" && event.listUpdated) {
                    updateOne(i => i.id === event.illustId)
                }else if(event.eventType === "entity/illust/deleted") {
                    if(event.illustType === "COLLECTION") {
                        if(listview.queryFilter.value.type === "COLLECTION") {
                            refresh()
                        }
                    }else{
                        removeOne(i => i.id === event.illustId)
                    }
                }else if(event.eventType === "entity/illust/images/changed") {
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
