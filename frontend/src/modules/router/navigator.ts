import { ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { windowManager } from "@/modules/window"
import { installation } from "@/utils/reactivity"
import { useListeningEvent, useRefEmitter } from "@/utils/emitter"
import { date } from "@/utils/datetime"
import { PreviewParameter, RouteName, RouteParameter } from "./definitions"
import { useRouterParamEmitter } from "./param"

/**
 * 页面跳转路由器。可以跳转到指定路由，或者打开新窗口并路由。
 */
export interface RouterNavigator {
    goto(routeName: RouteName): void
    goto<N extends RouteName>(options: {routeName: N, params?: RouteParameter[N]["params"], query?: Partial<RouteParameter[N]["query"]>}): void
    newWindow(routeName: RouteName): void
    newWindow<N extends RouteName>(options: {routeName: N, params?: RouteParameter[N]["params"], query?: Partial<RouteParameter[N]["query"]>}): void
    newPreviewWindow(options: PreviewParameter): void
}

export const [installRouterManager, useRouterManager] = installation(function () {
    return {
        paramManager: ref<{routeName: RouteName, params: any} | null>(null),
        navigatorEvent: useRefEmitter<RouteName>()
    }
})

/**
 * 创建页面跳转路由器。
 */
export function useRouterNavigator(): RouterNavigator {
    const router = useRouter()
    const paramEmitter = useRouterParamEmitter()
    const { navigatorEvent } = useRouterManager()

    function goto<N extends RouteName>(options: {routeName: N, params?: RouteParameter[N]["params"], query?: Partial<RouteParameter[N]["query"]>} | N) {
        const routeName = typeof options === "string" ? options : options.routeName
        const params = typeof options === "object" ? options.params : undefined
        const query = typeof options === "object" ? options.query : undefined

        if(params !== undefined) paramEmitter.emit(routeName, params)

        const routeQuery = query !== undefined ? encodeRouteQuery(routeName, query) : undefined

        router.push({ name: routeName, query: routeQuery }).finally()

        navigatorEvent.emit(routeName)
    }

    function newWindow<N extends RouteName>(options: {routeName: N, params?: RouteParameter[N]["params"], query?: Partial<RouteParameter[N]["query"]>} | N) {
        const routeName = typeof options === "string" ? options : options.routeName
        const params = typeof options === "object" ? options.params : undefined
        const query = typeof options === "object" ? options.query : undefined

        windowManager.newWindow(`/?routeName=${routeName}` +
            `&params=${params !== undefined ? encodeURIComponent(btoa(JSON.stringify(params))) : ""}` +
            `&query=${query !== undefined ? encodeURIComponent(btoa(JSON.stringify(query))) : ""}`)
    }

    function newPreviewWindow(options: PreviewParameter) {
        windowManager.newWindow(`/preview?target=${encodeURIComponent(btoa(JSON.stringify(options)))}`)
    }

    return {goto, newWindow, newPreviewWindow}
}

/**
 * 此函数应该被Index页面引用，以在初始化时对初始化导航参数做处理，跳转到想去的页面。
 */
export function useNewWindowRouteReceiver() {
    const route = useRoute()
    const navigator = useRouterNavigator()

    return {
        receiveRoute() {
            const routeName = (route.query["routeName"] || undefined) as RouteName | undefined
            if(routeName === undefined) return false

            const paramsStr = route.query["params"] as string | undefined
            const queryStr = route.query["query"] as string | undefined
            const paramsDecoded = paramsStr && atob(paramsStr)
            const queryDecoded = queryStr && atob(queryStr)
            const params = paramsDecoded ? JSON.parse(paramsDecoded) : undefined
            const query = queryDecoded ? JSON.parse(queryDecoded) : undefined

            navigator.goto({routeName, params, query})

            return true
        }
    }
}

/**
 * 此函数应该被Preview页面引用，以在初始化时提取参数。
 */
export function usePreviewWindowRouteReceiver(): PreviewParameter | undefined {
    const route = useRoute()
    
    const q = route.query["target"]
    if(q && typeof q === "string") {
        return JSON.parse(atob(q)) as PreviewParameter
    }
    return undefined
}

/**
 * 对路由的变化发起统一的监听。
 * 作用是有一个统一的位置，能获知通过router navigator发出的变更。
 */
export function useRouteChangeMonitor(receive: (routeName: RouteName) => void) {
    const { navigatorEvent } = useRouterManager()
    
    useListeningEvent(navigatorEvent, receive)
}

/**
 * 处理query参数的encode。因为其中有些参数需要特殊编码。
 * @param routeName
 * @param query
 */
function encodeRouteQuery<N extends RouteName>(routeName: N, query: Partial<RouteParameter[N]["query"]>): Record<string, string> | undefined {
    if(routeName === "MainTopic" || routeName === "MainAuthor" || routeName === "MainTag" || routeName === "MainAnnotation") {
        return (query as Record<string, any>)["detail"] && { detail: (query as Record<string, any>)["detail"] }
    }else if(routeName === "MainPartition") {
        return (query as Record<string, any>)["detail"] && { detail: date.toISOString((query as Record<string, any>)["detail"]) }
    }
    return undefined
}
