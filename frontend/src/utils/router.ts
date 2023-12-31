import { computed, ref, Ref, watch } from "vue"
import { useRoute } from "vue-router"


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

export function useQueryString(routerName: string, queryName: string): Ref<string | null> {
    return useQuery(routerName, queryName, s => s, s => s)
}

export function useQueryNumber(routerName: string, queryName: string): Ref<number | null> {
    return useQuery(routerName, queryName, s => s.toString(), s => {
        const n = parseInt(s)
        return isNaN(n) ? null : n
    })
}
