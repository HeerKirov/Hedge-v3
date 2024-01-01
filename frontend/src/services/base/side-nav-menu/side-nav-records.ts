import { reactive, Ref, toRaw, watch } from "vue"
import { MenuBadge } from "@/components/interaction"
import { useTabRoute } from "@/modules/browser"
import { installation } from "@/utils/reactivity"
import { mapAnyPathToString } from "@/utils/router"

export interface NavigationRecords {
    records: Readonly<{[routeName: string]: {id: string, path: unknown, label: string, badge: MenuBadge}[]}>
    excludes: {[routeName: string]: string[]}
    setRecord(options: {routeName: string, id: string, path: unknown, label: string, badge?: MenuBadge}): void
    clearRecord(routeName: string): void
}

export const [installNavigationRecords, useNavigationRecords] = installation(function (maxHistory: number = 5): NavigationRecords {
    const histories = reactive<{[routeName: string]: {id: string, path: unknown, label: string, badge: MenuBadge}[]}>({})
    const historiesBySort = <{[routeName: string]: {id: string, path: unknown, label: string, badge: MenuBadge}[]}>{}
    const excludes = reactive<{[routeName: string]: string[]}>({})

    const setRecord = (options: {routeName: string, id: string, path: unknown, label: string, badge?: MenuBadge}) => {
        const { routeName, id, path, label, badge } = options

        if(excludes[routeName]?.includes(id)) return

        const history = histories[routeName] || (histories[routeName] = [])
        const historyBySort = historiesBySort[routeName] || (historiesBySort[routeName] = [])

        //如果该项是已存在的，那么更新此项的内容，同时将其在sort中的位置提到第一位
        for(const item of history) {
            if(item.id === id) {
                item.label = label
                const idx = historyBySort.indexOf(toRaw(item)) //查询时注意脱壳，history里的是代理对象
                if(idx >= 1) {
                    historyBySort.splice(idx, 1)
                    historyBySort.splice(0, 0, item)
                }
                return
            }
        }

        //如果此项不存在，那么尝试向列表头插入
        if(history.length >= maxHistory) {
            //已经超出限制大小的情况下，根据sort的排序，从末尾移除项
            const [removedItem] = historyBySort.splice(historyBySort.length - 1, 1)
            const idx = history.indexOf(removedItem)
            history.splice(idx, 1)
        }

        const newItem = {id, path, label, badge}
        history.splice(0, 0, newItem)
        historyBySort.splice(0, 0, newItem)
    }

    const clearRecord = (routeName: string) => {
        histories[routeName] = []
        historiesBySort[routeName] = []
    }

    watch(() => excludes, excludes => {
        //当excludes发生更新时，从histories中排除exclude项
        for(const routeName of Object.keys(excludes)) {
            const exclude = excludes[routeName]
            if(exclude?.length) {
                const history = histories[routeName]
                const historyBySort = historiesBySort[routeName]
                if(history?.length) histories[routeName] = history.filter(i => !exclude.includes(i.id))
                if(historyBySort?.length) historiesBySort[routeName] = historyBySort.filter(i => !exclude.includes(i.id))
            }
        }
    })

    return {records: histories, excludes, setRecord, clearRecord}
})

export function useNavigationItem(recordChanged: Ref<string | {label: string, badge?: MenuBadge} | {name: string, badge?: MenuBadge} | {title: string, badge?: MenuBadge} | null | undefined> | (() => string | {label: string, badge?: MenuBadge} | {name: string, badge?: MenuBadge} | {title: string, badge?: MenuBadge} | null | undefined)) {
    const router = useTabRoute()
    const { setRecord } = useNavigationRecords()

    function getRecordFromChanged(rc: string | {label: string, badge?: MenuBadge} | {name: string, badge?: MenuBadge} | {title: string, badge?: MenuBadge} | null | undefined): {label: string, badge: MenuBadge} | undefined {
        if(rc !== null && rc !== undefined) {
            if(typeof rc === "string") {
                return {label: rc, badge: undefined}
            }else if(typeof rc === "object") {
                const label = (rc as {name: string}).name ?? (rc as {title: string}).title ?? (rc as {label: string}).label
                return {label, badge: rc.badge}
            }
        }
        return undefined
    }

    watch(recordChanged, rc => {
        const r = getRecordFromChanged(rc)
        if(r !== undefined) setRecord({routeName: router.route.value.routeName, id: mapAnyPathToString(router.route.value.path), path: router.route.value.path, ...r})
    }, {immediate: true})
}