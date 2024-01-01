import { computed, ref, Ref, watch } from "vue"
import { useRoute } from "vue-router"
import { date, LocalDate } from "@/utils/datetime";


/**
 * 从route中获取query参数。query参数被直接转化为可读写的Ref。
 */
export function useQuery<P>(routerName: string, queryName: string, encode: (d: P) => string, decode: (param: string) => P | null): Ref<P | null> {
    const route = useRoute()

    const data: Ref<P | null> = ref(null)

    function setNewData(value: P | null) {
        data.value = value
        route.query[queryName as string] = value != null ? encode(value) : null
    }

    function calcNewData(): P | null {
        if(routerName === null || route.name === routerName) {
            const v = route.query[queryName as string]
            if(v) {
                return decode(v as string)
            }
        }
        return null
    }

    watch(() => [route.name, route.query[queryName as string]] as const, () => {
        const newData = calcNewData()
        if(newData !== data.value) data.value = newData
    }, {immediate: true, deep: true})

    return computed({
        get: () => data.value,
        set: setNewData
    })
}

/**
 * 直接获得string类型的query参数。
 */
export function useQueryString(routerName: string, queryName: string): Ref<string | null> {
    return useQuery(routerName, queryName, s => s, s => s)
}

/**
 * 直接获得number类型的query参数。
 */
export function useQueryNumber(routerName: string, queryName: string): Ref<number | null> {
    return useQuery(routerName, queryName, s => s.toString(), s => {
        const n = parseInt(s)
        return isNaN(n) ? null : n
    })
}

/**
 * 将一个“任意”类型的path参数单项映射转换为string类型。
 */
export function mapAnyPathToString(path: unknown): string {
    if(path === null || path === undefined) {
        return ""
    }else if(typeof path === "string") {
        return path
    }else if(typeof path === "number" || typeof path === "boolean") {
        return path.toString()
    }else if(typeof path === "object") {
        if((path as LocalDate).year !== undefined && (path as LocalDate).day !== undefined && (path as LocalDate).day !== undefined) {
            return date.toISOString(path as LocalDate)
        }
        return JSON.stringify(path)
    }else{
        return `${path}`
    }
}