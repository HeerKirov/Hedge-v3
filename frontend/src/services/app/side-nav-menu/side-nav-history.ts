import { reactive, toRaw } from "vue"
import { useRoute } from "vue-router"
import { installation } from "@/utils/reactivity"

export interface NavHistory {
    histories: Readonly<{[routeName: string]: {id: string, label: string}[]}>
    pushHistory(id: string, label: string): void
    pushHistory(routeName: string, id: string, label: string): void
    clearHistory(routeName: string): void
}

export const [installNavHistory, useNavHistory] = installation(function (maxHistory: number = 5): NavHistory {
    const route = useRoute()

    const histories = reactive<{[routeName: string]: {id: string, label: string}[]}>({})
    const historiesBySort = <{[routeName: string]: {id: string, label: string}[]}>{}

    const pushHistory = (a: string, b: string, c?: string) => {
        const [routeName, id, label] = c !== undefined ? [a, b, c] : [route.name as string, a, b]

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

        const newItem = {id, label}
        history.splice(0, 0, newItem)
        historyBySort.splice(0, 0, newItem)
    }

    const clearHistory = (routeName: string) => {
        histories[routeName] = []
        historiesBySort[routeName] = []
    }

    return {histories, pushHistory, clearHistory}
})
