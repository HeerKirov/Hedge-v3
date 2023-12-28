import { Component, computed, DefineComponent, markRaw, onBeforeMount, Ref, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { windowManager } from "@/modules/window"
import { arrays, objects } from "@/utils/primitives"
import { installation, installationNullable } from "@/utils/reactivity"
import {
    BrowserDocument, BrowserRoute, BrowserStackView, BrowserTabs, BrowserViewOptions,
    InternalTab, NewRoute, Route, RouteDefinition, Tab
} from "./definition"

export const [installBrowserView, useBrowserView] = installation(function (options: BrowserViewOptions) {
    const vueRoute = useRoute()

    const defaultRouteDefinition = options.routes[0]
    const routeMaps = arrays.toTupleMap(options.routes, route => [route.routeName, route])
    const componentCaches: Record<string, Component | DefineComponent> = {}
    const historyMax = 5

    const views = ref<InternalTab[]>([])
    const activeIndex = ref(0)
    let nextTabIdVal = 1, nextHistoryIdVal = 1

    function nextTabId(): number {
        return nextTabIdVal++
    }

    function nextHistoryId(): number {
        return nextHistoryIdVal++
    }

    function getRouteDefinition(routeName?: string): RouteDefinition {
        if(routeName !== undefined) {
            const ret = routeMaps[routeName]
            if(ret === undefined) throw new Error(`routeName ${routeName} is not defined.`)
            return ret
        }
        return defaultRouteDefinition
    }

    function getComponentOrNull(routeName: string) : Component | DefineComponent | null {
        return componentCaches[routeName] ?? null
    }

    async function loadComponent(routeName: string): Promise<Component | DefineComponent> {
        if(!componentCaches[routeName]) componentCaches[routeName] = markRaw(((await routeMaps[routeName].component()) as any).default)
        return componentCaches[routeName]
    }

    onBeforeMount(() => {
        const routeName = (vueRoute.query["routeName"] || undefined) as string | undefined
        if(routeName) {
            const path = vueRoute.query["path"] ? JSON.parse(window.atob(vueRoute.query["path"] as string)) : undefined
            const params = vueRoute.query["params"] ? JSON.parse(window.atob(vueRoute.query["params"] as string)) : undefined
            const initializer = vueRoute.query["initializer"] ? JSON.parse(window.atob(vueRoute.query["initializer"] as string)) : undefined

            const routeDef = getRouteDefinition(routeName)
            const route: Route = {routeName: routeDef.routeName, path, params, initializer}

            console.log("received route", routeName, route)
            views.value.push({id: nextTabId(), historyId: nextHistoryId(), title: routeDef.defaultTitle ?? null, route, storage: {}, memoryStorage: {}, histories: [], forwards: []})
        }else{
            const routeDef = getRouteDefinition()
            const route: Route = {routeName: routeDef.routeName, path: undefined, params: {}, initializer: {}}

            views.value.push({id: nextTabId(), historyId: nextHistoryId(), title: routeDef.defaultTitle ?? null, route, storage: {}, memoryStorage: {}, histories: [], forwards: []})
        }
    })

    return {views, activeIndex, historyMax, nextTabId, nextHistoryId, getRouteDefinition, loadComponent, getComponentOrNull}
})

export const [installCurrentTab, useCurrentTab] = installationNullable(function (index: Ref<number>) {
    const { views } = useBrowserView()

    const view = ref<InternalTab>(views.value[index.value])

    watch([views, index], ([views, index]) => view.value = views[index], {deep: true})

    return {index, view}
})

export function useBrowserStackViews() {
    const { views, activeIndex, loadComponent, getComponentOrNull } = useBrowserView()

    const stackViews = ref<BrowserStackView[]>([])

    watch(views, async () => {
        const ret: BrowserStackView[] = []
        for (const v of views.value) {
            const component = await loadComponent(v.route.routeName)
            ret.push({id: v.id, stacks: [...v.histories.map(h => ({historyId: h.historyId, component: getComponentOrNull(h.route.routeName)!})), {historyId: v.historyId, component}]})
        }
        stackViews.value = ret
    }, {deep: true, immediate: true})

    return {stackViews, activeIndex}
}

export function useBrowserTabs(): BrowserTabs {
    const { views, activeIndex, getRouteDefinition, nextTabId, nextHistoryId } = useBrowserView()

    const tabs = computed<Tab[]>(() => views.value.map(({ id, title }, index) => ({id, index, title, active: activeIndex.value === index})))

    function newTab(args?: NewRoute) {
        const routeDef = getRouteDefinition(args?.routeName)
        const route: Route = args !== undefined ? {routeName: args.routeName, path: args.path, params: args.params ?? {}, initializer: args.initializer ?? {}} : {routeName: routeDef.routeName, path: undefined, params: {}, initializer: {}}
        views.value.push({id: nextTabId(), historyId: nextHistoryId(), title: routeDef.defaultTitle ?? null, route, storage: {}, memoryStorage: {}, histories: [], forwards: []})
        activeIndex.value = views.value.length - 1
    }

    function duplicateTab(args: {id?: number, index?: number}) {
        const viewIndex = args.index !== undefined ? args.index : args.id !== undefined ? views.value.findIndex(v => v.id === args.id) : -1
        const view = views.value[viewIndex]
        if(viewIndex >= 0 && view !== undefined) {
            views.value.splice(viewIndex + 1, 0, {...objects.deepCopy(view), id: nextTabId()})
            activeIndex.value = viewIndex + 1
        }
    }

    function activeTab(index: number) {
        if(index >= 0 && index < views.value.length) activeIndex.value = index
    }

    function moveTab(args: {id?: number, index?: number, toIndex: number}) {
        const index = args.index !== undefined ? args.index : args.id !== undefined ? views.value.findIndex(v => v.id === args.id) : -1
        if(index >= 0 && index < tabs.value.length && args.toIndex >= 0 && args.toIndex <= tabs.value.length && index !== args.toIndex) {
            if(args.toIndex > index) {
                views.value = [...views.value.slice(0, index), ...views.value.slice(index + 1, args.toIndex + 1), views.value[index], ...views.value.slice(args.toIndex + 1)]
                activeIndex.value = args.toIndex
            }else{
                views.value = [...views.value.slice(0, args.toIndex), views.value[index], ...views.value.slice(args.toIndex, index), ...views.value.slice(index + 1)]
                activeIndex.value = args.toIndex
            }
        }
    }

    function closeTab(args: {id?: number, index?: number}) {
        const index = args.index !== undefined ? args.index : args.id !== undefined ? views.value.findIndex(v => v.id === args.id) : -1
        if(index >= 0 && index < tabs.value.length) {
            views.value.splice(index, 1)
            if(views.value.length <= 0) {
                window.close()
            }else if(index < activeIndex.value || (index === activeIndex.value && activeIndex.value > 0)) {
                activeIndex.value -= 1
            }
        }
    }

    function newWindow(args?: Route) {
        const routeDef = getRouteDefinition(args?.routeName)
        const route: Route = args !== undefined ? {routeName: args.routeName, path: args.path, params: args.params ?? {}, initializer: args.initializer ?? {}} : {routeName: routeDef.routeName, path: undefined, params: {}, initializer: {}}
        const path = route.path !== undefined ? encodeURIComponent(window.btoa(JSON.stringify(route.path))) : ""
        const params = route.params !== undefined ? encodeURIComponent(window.btoa(JSON.stringify(route.params))) : ""
        const initializer = route.initializer !== undefined ? encodeURIComponent(window.btoa(JSON.stringify(route.initializer))) : ""
        windowManager.newWindow(`/main?routeName=${route.routeName}` +
            `&path=${path}` +
            `&params=${params}` +
            `&initializer=${initializer}`)
    }

    return {tabs, activeTab, newTab, moveTab, closeTab, duplicateTab, newWindow}
}

export function useBrowserRoute(view: Ref<InternalTab>): BrowserRoute {
    const { getRouteDefinition, nextHistoryId, historyMax } = useBrowserView()

    const route = computed(() => view.value.route)

    const histories = computed(() => view.value.histories)

    const forwards = computed(() => view.value.forwards)

    function routePush(route: NewRoute) {
        const routeDef = getRouteDefinition(route.routeName)
        view.value.histories.push({historyId: view.value.historyId, title: view.value.title, route: {...view.value.route, initializer: {}}, storage: view.value.storage})
        if(view.value.histories.length > historyMax) view.value.histories.shift()
        view.value.historyId = nextHistoryId()
        view.value.title = routeDef.defaultTitle ?? null
        view.value.route = {routeName: route.routeName, path: route.path, params: route.params ?? {}, initializer: route.initializer ?? {}}
        view.value.storage = {}
    }

    function routeReplace(route: NewRoute) {
        const routeDef = getRouteDefinition(route.routeName)
        view.value.title = routeDef.defaultTitle ?? null
        view.value.route = {routeName: route.routeName, path: route.path, params: route.params ?? {}, initializer: route.initializer ?? {}}
        view.value.storage = {}
    }

    function routeBack() {
        if(view.value.histories.length > 0) {
            const [history] = view.value.histories.splice(view.value.histories.length - 1, 1)
            view.value.forwards.push({historyId: view.value.historyId, title: view.value.title, route: {...view.value.route, initializer: {}}, storage: view.value.storage})
            if(view.value.forwards.length > historyMax) view.value.forwards.shift()
            view.value.historyId = history.historyId
            view.value.title = history.title
            view.value.route = history.route
            view.value.storage = history.storage
        }
    }

    function routeForward() {
        if(view.value.forwards.length > 0) {
            const [forward] = view.value.forwards.splice(view.value.forwards.length - 1, 1)
            view.value.histories.push({historyId: view.value.historyId, title: view.value.title, route: {...view.value.route, initializer: {}}, storage: view.value.storage})
            if(view.value.histories.length > historyMax) view.value.histories.shift()
            view.value.historyId = forward.historyId
            view.value.title = forward.title
            view.value.route = forward.route
            view.value.storage = forward.storage
        }
    }

    return {route, histories, forwards, routePush, routeReplace, routeBack, routeForward}
}

export function useActivateTabRoute(): BrowserRoute {
    const { views, activeIndex } = useBrowserView()

    const view = ref<InternalTab>(views.value[activeIndex.value])

    watch([views, activeIndex], ([views, index]) => view.value = views[index], {deep: true})

    return useBrowserRoute(view)
}

export function useTabRoute(): BrowserRoute {
    const { view } = useCurrentTab()!
    return useBrowserRoute(view)
}

export function useDocument(): BrowserDocument {
    const { views, activeIndex } = useBrowserView()

    const title = computed({
        get: () => views.value[activeIndex.value]?.title ?? "",
        set: value => {
            const view = views.value[activeIndex.value]
            if(view) views.value[activeIndex.value].title = value
        }
    })

    return {title}
}
