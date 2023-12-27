import { Component, computed, DefineComponent, markRaw, onBeforeMount, Ref, ref, watch } from "vue"
import { computedAsync, installation } from "@/utils/reactivity"
import { arrays, objects } from "@/utils/primitives"
import {
    BrowserDocument, BrowserRoute, BrowserStackView, BrowserTabs, BrowserViewOptions,
    InternalTab, NewRoute, Route, RouteDefinition, Tab
} from "./definition"


export const [installBrowserView, useBrowserView] = installation(function (options: BrowserViewOptions) {
    const defaultRouteDefinition = options.routes[0]
    const routeMaps = arrays.toTupleMap(options.routes, route => [route.routeName, route])
    const componentCaches: Record<string, Component | DefineComponent> = {}

    const views = ref<InternalTab[]>([]), activeIndex = ref(0)
    let nextTabIdVal = 1, nextHistoryIdVal = 1

    function nextTabId(): number {
        return nextTabIdVal++
    }

    function nextHistoryId(): number {
        return nextHistoryIdVal++
    }

    function getRouteDefinition(routeName?: string): RouteDefinition {
        return routeName !== undefined ? routeMaps[routeName] : defaultRouteDefinition
    }

    function getComponentOrNull(routeName: string) : Component | DefineComponent | null {
        return componentCaches[routeName] ?? null
    }

    async function loadComponent(routeName: string): Promise<Component | DefineComponent> {
        if(!componentCaches[routeName]) componentCaches[routeName] = markRaw(((await routeMaps[routeName].component()) as any).default)
        return componentCaches[routeName]
    }

    onBeforeMount(() => {
        const routeDef = getRouteDefinition()
        const route: Route = {routeName: routeDef.routeName, path: undefined, query: {}, params: {}}
        views.value.push({id: nextTabId(), historyId: nextHistoryId(), title: routeDef.defaultTitle ?? null, route, storage: {}, memoryStorage: {}, histories: [], forwards: []})
    })

    return {views, activeIndex, nextTabId, nextHistoryId, getRouteDefinition, loadComponent, getComponentOrNull}
})

export const [installCurrentTab, useCurrentTab] = installation(function (index: Ref<number>) {
    const { views } = useBrowserView()

    const view = ref<InternalTab>(views.value[index.value])

    watch([views, index], ([views, index]) => view.value = views[index], {deep: true})

    return {index, view}
})

export function useBrowserStackViews() {
    const { views, activeIndex, loadComponent, getComponentOrNull } = useBrowserView()

    const stackViews = computedAsync([], async () => {
        const ret: BrowserStackView[] = []
        for (const v of views.value) {
            const component = await loadComponent(v.route.routeName)
            ret.push({id: v.id, stacks: [...v.histories.map(h => ({historyId: h.historyId, component})), {historyId: v.historyId, component: getComponentOrNull(v.route.routeName)!}]})
        }
        return ret
    })

    return {stackViews, activeIndex}
}

export function useBrowserTabs(): BrowserTabs {
    const { views, activeIndex, getRouteDefinition, nextTabId, nextHistoryId } = useBrowserView()

    const tabs = computed<Tab[]>(() => views.value.map(({ id, title }, index) => ({id, index, title, active: activeIndex.value === index})))

    function newTab(args?: NewRoute) {
        const routeDef = getRouteDefinition(args?.routeName)
        const route: Route = args !== undefined ? {routeName: args.routeName, path: args.path, query: args.query ?? {}, params: args.params ?? {}} : {routeName: routeDef.routeName, path: undefined, query: {}, params: {}}
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
                //TODO close window
            }else if(index < activeIndex.value || (index === activeIndex.value && activeIndex.value > 0)) {
                activeIndex.value -= 1
            }
        }
    }

    function newWindow(args?: Route) {
        //TODO new window
    }

    return {tabs, activeTab, newTab, moveTab, closeTab, duplicateTab, newWindow}
}

export function useBrowserRoute(view: Ref<InternalTab>): BrowserRoute {
    const { getRouteDefinition, nextHistoryId } = useBrowserView()

    const route = computed(() => view.value.route)

    const histories = computed(() => view.value.histories)

    const forwards = computed(() => view.value.forwards)

    function routePush(route: NewRoute) {
        const routeDef = getRouteDefinition(route.routeName)
        view.value.histories.push({historyId: view.value.historyId, title: view.value.title, route: {...view.value.route, params: {}}, storage: view.value.storage})
        view.value.historyId = nextHistoryId()
        view.value.title = routeDef.defaultTitle ?? null
        view.value.route = {routeName: route.routeName, path: route.path, query: route.query ?? {}, params: route.params ?? {}}
        view.value.storage = {}
    }

    function routeReplace(route: NewRoute) {
        const routeDef = getRouteDefinition(route.routeName)
        view.value.title = routeDef.defaultTitle ?? null
        view.value.route = {routeName: route.routeName, path: route.path, query: route.query ?? {}, params: route.params ?? {}}
        view.value.storage = {}
    }

    function routeBack() {
        if(view.value.histories.length > 0) {
            const [history] = view.value.histories.splice(view.value.histories.length - 1, 1)
            view.value.forwards.push({historyId: view.value.historyId, title: view.value.title, route: {...view.value.route, params: {}}, storage: view.value.storage})
            view.value.historyId = history.historyId
            view.value.title = history.title
            view.value.route = history.route
            view.value.storage = history.storage
        }
    }

    function routeForward() {
        if(view.value.forwards.length > 0) {
            const [forward] = view.value.forwards.splice(view.value.forwards.length - 1, 1)
            view.value.histories.push({historyId: view.value.historyId, title: view.value.title, route: {...view.value.route, params: {}}, storage: view.value.storage})
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
    const { view } = useCurrentTab()
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
