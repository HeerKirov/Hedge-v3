import { ComponentPublicInstance, Ref, computed, watch } from "vue"
import { Partition, IllustQueryFilter } from "@/functions/http-client/api/illust"
import { flatResponse } from "@/functions/http-client"
import { useFetchReactive } from "@/functions/fetch"
import { useLocalStorage, useTabStorage } from "@/functions/app"
import { useDocumentTitle, useInitializer, usePath, useTabRoute } from "@/modules/browser"
import { useInterceptedKey } from "@/modules/keyboard"
import { writeClipboard } from "@/modules/others"
import { useNavHistoryPush } from "@/services/base/side-nav-menu"
import { QuerySchemaContext, useQuerySchema } from "@/services/base/query-schema"
import { IllustViewController, useIllustViewController } from "@/services/base/view-controller"
import { useListViewContext } from "@/services/base/list-view-context"
import { useSelectedState } from "@/services/base/selected-state"
import { useSelectedPaneState } from "@/services/base/selected-pane-state"
import { installIllustListviewContext, useImageDatasetOperators, useLocateId } from "@/services/common/illust"
import { useSettingSite } from "@/services/setting"
import { useHomepageState } from "@/services/main/homepage"
import { computedEffect, computedWatch, installation } from "@/utils/reactivity"
import { LocalDate, date, getDaysOfMonth } from "@/utils/datetime"
import { arrays, numbers } from "@/utils/primitives"

export const [installPartitionContext, usePartitionContext] = installation(function() {
    const router = useTabRoute()
    const querySchema = useQuerySchema("ILLUST")
    const listviewController = useIllustViewController()
    const partition = usePartitionView(listviewController, querySchema)

    const openDetail = (date: LocalDate) => router.routePush({routeName: "PartitionDetail", path: date})

    useDocumentTitle(() => partition.viewMode.value === "calendar" ? "日历" : "时间线")

    return {partition, querySchema, listviewController, openDetail}
})

function usePartitionView(listviewController: IllustViewController, querySchema: QuerySchemaContext) {
    const viewMode = useLocalStorage<"calendar" | "timeline">("partition/list/view-mode", "calendar")
    const calendarDate = useTabStorage<YearAndMonth>("partition/list/calendar-date")

    const { partitionMonths, partitions, total, maxCount, maxCountOfMonth } = usePartitionData(listviewController, querySchema.query)
    const operators = usePartitionOperators(partitions, querySchema.queryInputText)

    watch(partitionMonths, months => {
        //在未设置calendarDate，或者当前月份列表中不存在现在的值时，将其重置为最后一个月份
        if(months !== undefined && months.length && (calendarDate.value === null || !months.some(m => m.year === calendarDate.value!.year && m.month === calendarDate.value!.month))) {
            calendarDate.value = {year: months[months.length - 1].year, month: months[months.length - 1].month}
        }
    })

    return {partitions, partitionMonths, total, maxCount, maxCountOfMonth, viewMode, calendarDate, operators}
}

function usePartitionData(listviewController: IllustViewController, query: Ref<string | undefined>) {
    const { data: partitions, refresh } = useFetchReactive({
        get: client => () => client.illust.listPartitions({type: typeof listviewController.collectionMode.value === "boolean" ? (listviewController.collectionMode.value ? "COLLECTION" : "IMAGE") : listviewController.collectionMode.value, query: query.value})
    })

    watch([listviewController.collectionMode, query], refresh)

    useInterceptedKey("Meta+KeyR", refresh)

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
            for(const pm of partitionMonths) {
                count += pm.count
                day += pm.days.length
            }
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

function usePartitionOperators(partitions: Ref<Partition[] | undefined>, queryText: Ref<string | undefined>) {
    const copyDateList = () => {
        if(partitions.value?.length) {
            const text = partitions.value.map(p => date.toISOString(p.date)).join("\n")
            writeClipboard(text)
        }
    }

    const addDateListToQueryText = () => {
        if(partitions.value?.length) {
            const text = `partition:{${partitions.value.map(p => date.toISOString(p.date)).join(", ")}}`
            queryText.value += (queryText.value ? " " : "") + text
        }
    }

    return {copyDateList, addDateListToQueryText}
}

export function useCalendarContext() {
    const today = date.now()
    const WEEKDAY_SPACE_COUNT = [6, 0, 1, 2, 3, 4, 5]

    const { partition: { calendarDate, partitionMonths, maxCount }, openDetail } = usePartitionContext()

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
        if(calendarDate.value !== null && item.count) openDetail(date.ofDate(calendarDate.value.year, calendarDate.value.month, item.day))
    }

    return {items, openPartition, calendarDate}
}

export function useTimelineContext() {
    const { partition: { calendarDate, partitions, partitionMonths, maxCount, maxCountOfMonth, operators }, openDetail } = usePartitionContext()

    const months = computed(() => partitionMonths.value?.map(pm => ({year: pm.year, month: pm.month, uniqueKey: pm.year * 12 + pm.month, dayCount: pm.days.length, count: pm.count, width: numbers.round2decimal(pm.count * 100 / maxCountOfMonth.value), level: Math.ceil(pm.count * 10 / maxCountOfMonth.value)})) ?? [])

    const days = computed(() => partitions.value?.map(p => ({date: p.date, count: p.count, width: numbers.round2decimal(p.count * 100 / maxCount.value), level: Math.ceil(p.count * 10 / maxCount.value)})) ?? [])

    const calendarDateMonths = computed(() => partitionMonths.value !== undefined && calendarDate.value !== null ? partitionMonths.value.find(pm => pm.year === calendarDate.value!.year && pm.month === calendarDate.value!.month) ?? null : null)

    let timelineRef: HTMLDivElement | null = null
    const monthRefs: Record<number, HTMLDivElement> = {}
    const dayRefs: Record<number, HTMLDivElement> = {}

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

    //在calendarDate变化时，重新聚焦month。
    //也聚焦day，但要复杂一些。如果目标月份在显示区域内，则什么也不做；如果在后面，则滚动到月份的最后一天以显示该月的全部日期；同理如果在前面则滚动到月份的第一天
    watch(calendarDateMonths, async partitionMonth => {
        if(partitionMonth !== null) {
            monthRefs[partitionMonth.year * 12 + partitionMonth.month]?.scrollIntoView({behavior: "auto"})
            const positionOffset = getPositionOfMonth(partitionMonth.days)
            if(positionOffset > 0) {
                dayRefs[partitionMonth.days[partitionMonth.days.length - 1].date.timestamp]?.scrollIntoView({behavior: "auto"})
            }else if(positionOffset < 0) {
                dayRefs[partitionMonth.days[0].date.timestamp]?.scrollIntoView({behavior: "auto"})
            }
        }
    }, {immediate: true, flush: "post"})

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
        openDetail(date)
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

    return {months, days, calendarDate, selectMonth, scrollEvent, openPartition, setTimelineRef, setDayRef, setMonthRef, operators}
}

export function useDetailIllustContext() {
    const path = usePath<LocalDate>()
    const querySchema = useQuerySchema("ILLUST")
    const listviewController = useIllustViewController()

    const listview = useListView()
    const selector = useSelectedState({queryListview: listview.listview, keyOf: item => item.id})
    const paneState = useSelectedPaneState("illust")
    const operators = useImageDatasetOperators({
        listview: listview.listview, paginationData: listview.paginationData,
        listviewController, selector,
        dataDrop: {dropInType: "partition", path, querySchema: querySchema.schema, queryFilter: listview.queryFilter}
    })
    const locateId = useLocateId({queryFilter: listview.queryFilter, paginationData: listview.paginationData, selector})
    const state = useHomepageState()

    watch(listviewController.collectionMode, collectionMode => listview.queryFilter.value.type = typeof collectionMode === "boolean" ? (collectionMode ? "COLLECTION" : "IMAGE") : collectionMode, {immediate: true})
    watch(querySchema.query, query => listview.queryFilter.value.query = query, {immediate: true})
    watch(path, path => listview.queryFilter.value.partition = path ?? undefined, {immediate: true})

    installIllustListviewContext({listview, selector, listviewController})

    useSettingSite()

    useInitializer(params => {
        if(params.locateId !== undefined && querySchema.queryInputText.value) {
            //若提供了Locate，则应该清空现有的查询条件
            querySchema.queryInputText.value = undefined
        }
        locateId.catchLocateId(params.locateId)
    })

    useNavHistoryPush(path, p => {
        const id = date.toISOString(p)
        const name = `${p.year}年${p.month}月${p.day}日`
        const today = state.data.value?.today.timestamp === p.timestamp
        return {id, name, badge: today ? "TODAY" : undefined}
    })

    useDocumentTitle(() => `${path.value.year}年${path.value.month}月${path.value.day}日`)

    return {path, listview, selector, paneState, operators, querySchema, listviewController}
}

function useListView() {
    const listview = useListViewContext({
        defaultFilter: <IllustQueryFilter>{order: "orderTime", type: "IMAGE"},
        request: client => (offset, limit, filter) => client.illust.list({offset, limit, ...filter}),
        keyOf: item => item.id,
        eventFilter: {
            filter: ["entity/illust/created", "entity/illust/updated", "entity/illust/deleted", "entity/illust/images/changed"],
            operation({ event, refresh, updateKey, removeKey }) {
                if(event.eventType === "entity/illust/created" || (event.eventType === "entity/illust/updated" && event.timeSot)) {
                    refresh()
                }else if(event.eventType === "entity/illust/updated" && event.listUpdated) {
                    updateKey(event.illustId)
                }else if(event.eventType === "entity/illust/deleted") {
                    if(event.illustType === "COLLECTION") {
                        if(listview.queryFilter.value.type === "COLLECTION") {
                            refresh()
                        }
                    }else{
                        removeKey(event.illustId)
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
