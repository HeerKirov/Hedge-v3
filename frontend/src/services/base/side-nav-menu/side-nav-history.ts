import { reactive, Ref, toRaw, watch } from "vue"
import { BadgeDefinition, MenuBadge } from "@/components/interaction"
import { useActivateTabRoute } from "@/modules/browser"
import { installation } from "@/utils/reactivity"

export interface NavHistory {
    histories: Readonly<{[routeName: string]: {id: string, label: string, badge: MenuBadge}[]}>
    excludes: {[routeName: string]: string[]}
    pushHistory(options: {routeName?: string, id: string, label: string, badge?: MenuBadge}): void
    clearHistory(routeName: string): void
}

export const [installNavHistory, useNavHistory] = installation(function (maxHistory: number = 5): NavHistory {
    const route = useActivateTabRoute()

    const histories = reactive<{[routeName: string]: {id: string, label: string, badge: MenuBadge}[]}>({})
    const historiesBySort = <{[routeName: string]: {id: string, label: string, badge: MenuBadge}[]}>{}
    const excludes = reactive<{[routeName: string]: string[]}>({})

    const pushHistory = (options: {routeName?: string, id: string, label: string, badge?: MenuBadge}) => {
        const { routeName = route.route.value.routeName, id, label, badge } = options

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

        const newItem = {id, label, badge}
        history.splice(0, 0, newItem)
        historyBySort.splice(0, 0, newItem)
    }

    const clearHistory = (routeName: string) => {
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

    return {histories, excludes, pushHistory, clearHistory}
})

export function useNavHistoryPush<T extends {id: number, name: string}>(watcher: Ref<T | null>): void
export function useNavHistoryPush<T extends object>(watcher: Ref<T | null>, generator: (d: T) => {id: number | string, name: string, badge?: MenuBadge}): void
export function useNavHistoryPush<T extends object>(watcher: Ref<T | null>, generator?: (d: T) => {id: number | string, name: string, badge?: MenuBadge}) {
    const { pushHistory } = useNavHistory()

    if(generator !== undefined) {
        watch(watcher, d => {
            if(d !== null) {
                const { id, name, badge } = generator(d)
                const finalId = typeof id === "number" ? id.toString() : id
                pushHistory({id: finalId, label: name, badge})
            }
        }, {immediate: true})
    }else{
        watch(watcher, d => {
            if(d !== null) {
                const { id, name, badge } = d as {id: number, name: string, badge?: string | number | BadgeDefinition | BadgeDefinition[]}
                pushHistory({id: id.toString(), label: name, badge})
            }
        }, {immediate: true})
    }
}
