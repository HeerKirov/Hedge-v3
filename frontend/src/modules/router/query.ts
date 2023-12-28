import { computed, ref, Ref, watch } from "vue"
import { date, LocalDate } from "@/utils/datetime"
import { useActivateTabRoute } from "@/modules/browser"
import { RouteName, RouteParameter } from "./definitions"

/**
 * 从route中获取query参数。query参数被直接转化为可读写的Ref。
 */
export function useRouterQuery<N extends RouteName, Q extends keyof RouteParameter[N]["query"], P extends RouteParameter[N]["query"][Q]>(routerName: N, queryName: Q, encode: (d: P) => string, decode: (param: string) => P | null): Ref<P | null> {
    const { route } = useActivateTabRoute()

    const data: Ref<P | null> = ref(null)

    function setNewData(value: P | null) {
        data.value = value
        route.value.params[queryName as string] = value != null ? encode(value) : null
    }

    function calcNewData(): P | null {
        if(routerName === null || route.value.routeName === routerName) {
            const v = route.value.params[queryName as string]
            if(v) {
                return decode(v)
            }
        }
        return null
    }

    watch(() => [route.value.routeName, route.value.params[queryName as string]] as const, () => {
        const newData = calcNewData()
        if(newData !== data.value) data.value = newData
    }, {immediate: true, deep: true})

    return computed({
        get: () => data.value,
        set: setNewData
    })
}

export function useRouterQueryLocalDate<N extends RouteName, Q extends keyof RouteParameter[N]["query"], P extends RouteParameter[N]["query"][Q] & LocalDate>(routerName: N, queryName: Q): Ref<P | null> {
    return useRouterQuery<N, Q, P>(routerName, queryName, s => date.toISOString(s), s => {
        try {
            return date.of(s) as P
        }catch (_) {
            return null
        }
    })
}

export function useRouterQueryString<N extends RouteName, Q extends keyof RouteParameter[N]["query"], P extends RouteParameter[N]["query"][Q] & string>(routerName: N, queryName: Q): Ref<P | null> {
    return useRouterQuery<N, Q, P>(routerName, queryName, s => s, s => s as P)
}

export function useRouterQueryNumber<N extends RouteName, Q extends keyof RouteParameter[N]["query"], P extends RouteParameter[N]["query"][Q] & number>(routerName: N, queryName: Q): Ref<P | null> {
    return useRouterQuery(routerName, queryName, s => s.toString(), s => {
        const n = parseInt(s)
        return isNaN(n) ? null : n as P
    })
}

export const useQuery: <P>(routerName: string, queryName: string, encode: (a: P) => string, decode: (s: string) => P) => Ref<P | null> = useRouterQuery as any

export const useQueryString: (routerName: string, queryName: string) => Ref<string | null> = useRouterQueryString as any

export const useQueryNumber: (routerName: string, queryName: string) => Ref<number | null> = useRouterQueryNumber as any