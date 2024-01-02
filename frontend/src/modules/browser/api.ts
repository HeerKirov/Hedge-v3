import { Component, computed, DefineComponent, markRaw, onBeforeMount, Ref, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { windowManager } from "@/modules/window"
import { arrays, objects } from "@/utils/primitives"
import { installation, installationNullable } from "@/utils/reactivity"
import { useListeningEvent, useRefEmitter } from "@/utils/emitter"
import {
    BrowserDocument, BrowserRoute, BrowserTabStack, BrowserTabs, BrowserViewOptions, InternalPage,
    InternalTab, NewRoute, Route, RouteDefinition, Tab, BrowserTabEvent
} from "./definition"

export const [installBrowserView, useBrowserView] = installationNullable(function (options: BrowserViewOptions) {
    const vueRoute = useRoute()

    const defaultRouteDefinition = options.routes[0]
    const routeMaps = arrays.toTupleMap(options.routes, route => [route.routeName, route])
    const componentCaches: Record<string, Component | DefineComponent> = {}
    const historyMax = 5

    const views = ref<InternalTab[]>([]), activeIndex = ref(0), event = useRefEmitter<BrowserTabEvent>()
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

            views.value.push({id: nextTabId(), historyId: nextHistoryId(), title: routeDef.defaultTitle ?? null, route, storage: {}, memoryStorage: {}, histories: [], forwards: []})
        }else{
            const routeDef = getRouteDefinition()
            const route: Route = {routeName: routeDef.routeName, path: undefined, params: {}, initializer: {}}

            views.value.push({id: nextTabId(), historyId: nextHistoryId(), title: routeDef.defaultTitle ?? null, route, storage: {}, memoryStorage: {}, histories: [], forwards: []})
        }
    })

    return {views, activeIndex, historyMax, event, nextTabId, nextHistoryId, getRouteDefinition, loadComponent, getComponentOrNull}
})

export const [installCurrentTab, useCurrentTab] = installationNullable(function (props: {id: number, historyId: number}) {
    const { views, activeIndex } = useBrowserView()!

    const view = ref<InternalTab>(views.value.find(v => v.id === props.id)!)

    const page = ref<InternalPage>(view.value.historyId === props.historyId ? view.value : (view.value.histories.find(p => p.historyId === props.historyId) ?? view.value.forwards.find(p => p.historyId === props.historyId)!!))

    const active = computed(() => view.value.historyId === props.historyId && views.value.findIndex(v => v.id === props.id) === activeIndex.value)

    watch(() => [views.value, props.id] as const, ([views, id]) => {
        const ret = views.find(v => v.id === id)
        if(ret !== undefined) view.value = ret
    }, {deep: true})

    watch(() => [view.value, props.historyId] as const, ([view, historyId]) => {
        const ret = view.historyId === historyId ? view : (view.histories.find(p => p.historyId === historyId) ?? view.forwards.find(p => p.historyId === historyId))
        if(ret !== undefined) page.value = ret
    }, {deep: true})

    return {view, page, active}
})

export function isBrowserEnvironment() {
    const view = useBrowserView()
    return view !== undefined
}

export function useBrowserTabStacks() {
    const { views, activeIndex, loadComponent, getComponentOrNull } = useBrowserView()!

    const tabStacks = ref<BrowserTabStack[]>([])

    watch(views, async () => {
        const ret: BrowserTabStack[] = []
        for (const v of views.value) {
            const component = await loadComponent(v.route.routeName)
            //...v.histories.map(h => ({historyId: h.historyId, component: getComponentOrNull(h.route.routeName)!}))
            ret.push({id: v.id, stacks: [{historyId: v.historyId, component}]})
        }
        tabStacks.value = ret
    }, {deep: true, immediate: true})

    return {tabStacks, activeIndex}
}

export function useBrowserTabs(): BrowserTabs {
    const { views, activeIndex, getRouteDefinition, nextTabId, nextHistoryId, event } = useBrowserView()!

    const tabs = computed<Tab[]>(() => views.value.map(({ id, title }, index) => ({id, index, title, active: activeIndex.value === index})))

    function newTab(args?: NewRoute) {
        const routeDef = getRouteDefinition(args?.routeName)
        const route: Route = args !== undefined ? {routeName: args.routeName, path: args.path, params: args.params ?? {}, initializer: args.initializer ?? {}} : {routeName: routeDef.routeName, path: undefined, params: {}, initializer: {}}
        views.value.push({id: nextTabId(), historyId: nextHistoryId(), title: routeDef.defaultTitle ?? null, route, storage: {}, memoryStorage: {}, histories: [], forwards: []})
        activeIndex.value = views.value.length - 1
        event.emit({type: "TabCreated"})
    }

    function duplicateTab(args: {id?: number, index?: number}) {
        const viewIndex = args.index !== undefined ? args.index : args.id !== undefined ? views.value.findIndex(v => v.id === args.id) : -1
        const view = views.value[viewIndex]
        if(viewIndex >= 0 && view !== undefined) {
            views.value.splice(viewIndex + 1, 0, {...objects.deepCopy(view), id: nextTabId()})
            activeIndex.value = viewIndex + 1
            event.emit({type: "TabCreated"})
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
            event.emit({type: "TabClosed"})
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

function useBrowserRoute(view: Ref<InternalTab>, page?: Ref<InternalPage>): BrowserRoute {
    const { views, activeIndex, getRouteDefinition, nextHistoryId, historyMax, event } = useBrowserView()!

    const route = computed(() => page?.value.route ?? view.value.route)

    const histories = computed(() => view.value.histories)

    const forwards = computed(() => view.value.forwards)

    function routePush(route: NewRoute) {
        const routeDef = getRouteDefinition(route.routeName)
        view.value.forwards.splice(0, view.value.forwards.length)
        view.value.histories.push({historyId: view.value.historyId, title: view.value.title, route: {...view.value.route, initializer: {}}, storage: view.value.storage})
        if(view.value.histories.length > historyMax) view.value.histories.shift()
        view.value.historyId = nextHistoryId()
        view.value.title = routeDef.defaultTitle ?? null
        view.value.route = {routeName: route.routeName, path: route.path, params: route.params ?? {}, initializer: route.initializer ?? {}}
        view.value.storage = {}
        event.emit({type: "Routed"})
    }

    function routeReplace(route: NewRoute) {
        const routeDef = getRouteDefinition(route.routeName)
        view.value.title = routeDef.defaultTitle ?? null
        view.value.route = {routeName: route.routeName, path: route.path, params: route.params ?? {}, initializer: route.initializer ?? {}}
        view.value.storage = {}
        event.emit({type: "Routed"})
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
            event.emit({type: "Routed"})
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
            event.emit({type: "Routed"})
        }
    }

    function routeClose() {
        if(page !== undefined && page.value.historyId !== view.value.historyId) {
            const index = view.value.histories.findIndex(p => p.historyId === page.value.historyId)
            if(index >= 0) view.value.histories.splice(index, 1)
        }else if(view.value.histories.length > 0) {
            const [history] = view.value.histories.splice(view.value.histories.length - 1, 1)
            view.value.historyId = history.historyId
            view.value.title = history.title
            view.value.route = history.route
            view.value.storage = history.storage
            event.emit({type: "Routed"})
        }else{
            const index = views.value.findIndex(v => v.id === view.value.id)
            if(index >= 0) {
                views.value.splice(index, 1)
                if(views.value.length <= 0) {
                    window.close()
                }else if(index < activeIndex.value || (index === activeIndex.value && activeIndex.value > 0)) {
                    activeIndex.value -= 1
                }
                event.emit({type: "TabClosed"})
            }
        }
    }

    return {route, histories, forwards, routePush, routeReplace, routeBack, routeForward, routeClose}
}

export function useActivateTabRoute(): BrowserRoute {
    const { views, activeIndex } = useBrowserView()!

    const view = ref<InternalTab>(views.value[activeIndex.value])

    watch([views, activeIndex], ([views, index]) => view.value = views[index], {deep: true})

    return useBrowserRoute(view)
}

export function useTabRoute(): BrowserRoute {
    const tab = useCurrentTab()
    if(tab) {
        return useBrowserRoute(tab.view, tab.page)
    }else{
        return useActivateTabRoute()
    }
}

function useDocument(): BrowserDocument {
    const { page } = useCurrentTab()!

    const title = computed({
        get: () => page.value.title,
        set: value => page.value.title = value
    })

    return {title}
}

export function useDocumentTitle(titleChanged: Ref<string | {name: string} | {title: string} | null | undefined> | (() => (string | {name: string} | {title: string} | null | undefined))) {
    const document = useDocument()
    watch(titleChanged, tc => {
        if(tc !== null && tc !== undefined) {
            if(typeof tc === "string") {
                document.title.value = tc
            }else if(typeof tc === "object") {
                document.title.value = (tc as {name: string}).name ?? (tc as {title: string}).title
            }
        }
    }, {immediate: true})
}

export function useBrowserEvent(arg: (e: BrowserTabEvent) => void) {
    const { event } = useBrowserView()!
    useListeningEvent(event, arg)
}