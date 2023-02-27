import { useRoute, useRouter } from "vue-router"
import { date } from "@/utils/datetime"
import { windowManager } from "@/modules/window"
import { RouteName, RouteParameter } from "./definitions"
import { useRouterParamEmitter } from "./param"

/**
 * 页面跳转路由器。可以跳转到指定路由，或者打开新窗口并路由。
 */
export interface RouterNavigator {
    goto(routeName: RouteName): void
    goto<N extends RouteName>(options: {routeName: N, params?: RouteParameter[N]["params"], query?: Partial<RouteParameter[N]["query"]>}): void
    newWindow(routeName: RouteName): void
    newWindow<N extends RouteName>(options: {routeName: N, params?: RouteParameter[N]["params"], query?: Partial<RouteParameter[N]["query"]>}): void
}

/**
 * 创建页面跳转路由器。
 */
export function useRouterNavigator(): RouterNavigator {
    const router = useRouter()
    const paramEmitter = useRouterParamEmitter()

    function goto<N extends RouteName>(options: {routeName: N, params?: RouteParameter[N]["params"], query?: Partial<RouteParameter[N]["query"]>} | N) {
        const routeName = typeof options === "string" ? options : options.routeName
        const params = typeof options === "object" ? options.params : undefined
        const query = typeof options === "object" ? options.query : undefined

        if(params !== undefined) paramEmitter.emit(routeName, params)

        const routeQuery = query !== undefined ? encodeRouteQuery(routeName, query) : undefined

        router.push({ name: routeName, query: routeQuery }).finally()
    }

    function newWindow<N extends RouteName>(options: {routeName: N, params?: RouteParameter[N]["params"], query?: Partial<RouteParameter[N]["query"]>} | N) {
        const routeName = typeof options === "string" ? options : options.routeName
        const params = typeof options === "object" ? options.params : undefined
        const query = typeof options === "object" ? options.query : undefined

        windowManager.newWindow(`/?routeName=${routeName}` +
            `&params=${params !== undefined ? encodeURIComponent(Buffer.from(JSON.stringify(params), "utf-8").toString("base64")) : ""}` +
            `&query=${query !== undefined ? encodeURIComponent(Buffer.from(JSON.stringify(query), "utf-8").toString("base64")) : ""}`)
    }

    return {goto, newWindow}
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
            const paramsDecoded = paramsStr && Buffer.from(paramsStr, "base64").toString("utf-8")
            const queryDecoded = queryStr && Buffer.from(queryStr, "base64").toString("utf-8")
            const params = paramsDecoded ? JSON.parse(paramsDecoded) : undefined
            const query = queryDecoded ? JSON.parse(queryDecoded) : undefined

            navigator.goto({routeName, params, query})

            return true
        }
    }
}

/**
 * 处理query参数的encode。因为其中有些参数需要特殊编码。
 * @param routeName
 * @param query
 */
function encodeRouteQuery<N extends RouteName>(routeName: N, query: Partial<RouteParameter[N]["query"]>): Record<string, string> | undefined {
    if(routeName === "MainTopic" || routeName === "MainAuthor" || routeName === "MainTag" || routeName === "MainAnnotation") {
        return (query as Record<string, any>)["query"] && { detail: (query as Record<string, any>)["detail"] }
    }else if(routeName === "MainPartition") {
        return (query as Record<string, any>)["query"] && { detail: date.toISOString((query as Record<string, any>)["query"]) }
    }
    return undefined
}
