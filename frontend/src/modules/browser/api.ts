import { Component, computed, DefineComponent, markRaw, onBeforeMount, Ref, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { useApplicationMenuTabs } from "@/functions/app/app-menu"
import { windowManager } from "@/modules/window"
import { arrays, objects } from "@/utils/primitives"
import { installationNullable } from "@/utils/reactivity"
import { SendRefEmitter, useListeningEvent, useRefEmitter } from "@/utils/emitter"
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

    function matchStacks(tab: InternalTab, prevStacks: {historyId: number}[] | undefined): InternalPage[] {
        if(!options.stackDefinitions?.length || tab.histories.length <= 0) return []
        const ret: InternalPage[] = []
        let filtered = options.stackDefinitions.filter(d => d[d.length - 1] === tab.current.route.routeName)
        for(let i = tab.histories.length - 1, step = 2; i >= 0; --i, ++step) {
            const nextFiltered = filtered.filter(d => d.length >= step && d[d.length - step] === tab.histories[i].route.routeName)
            if(nextFiltered.length > 0) {
                filtered = nextFiltered
                ret.unshift(tab.histories[i])
            }else{
                //tips: 之前的一个隐藏坑已被解决，这里没加打断导致可以跨元素匹配，也就会出现[1 3][2]这样的交替加载bug。
                break
            }
        }
        //tips: 之前的一个遗留瑕疵已被解决。现在获取prev stacks，即上一个状态中被装载的history。
        //根据此stacks列表进行过滤，不存在于此列表的history page被滤掉，也就不会出现超前加载历史页面的问题
        return ret.filter(page => prevStacks?.find(s => s.historyId === page.historyId) ?? false)
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

            views.value.push({id: nextTabId(), memoryStorage: {}, current: {historyId: nextHistoryId(), title: routeDef.defaultTitle ?? null, route, storage: {}}, histories: [], forwards: []})
        }else{
            const routeDef = getRouteDefinition()
            const route: Route = {routeName: routeDef.routeName, path: undefined, params: {}, initializer: {}}

            views.value.push({id: nextTabId(), memoryStorage: {}, current: {historyId: nextHistoryId(), title: routeDef.defaultTitle ?? null, route, storage: {}}, histories: [], forwards: []})
        }
    })

    const browserTabs = installBrowserTabs(views, activeIndex, getRouteDefinition, nextTabId, nextHistoryId, historyMax, event)

    return {views, activeIndex, historyMax, event, nextTabId, nextHistoryId, matchStacks, getRouteDefinition, loadComponent, getComponentOrNull, browserTabs}
})

function installBrowserTabs(views: Ref<InternalTab[]>, activeIndex: Ref<number>, getRouteDefinition: (routeName?: string) => RouteDefinition, nextTabId: () => number, nextHistoryId: () => number, historyMax: number, event: SendRefEmitter<BrowserTabEvent>): BrowserTabs {
    const tabs = computed<Tab[]>(() => views.value.map(({ id, current: { title } }, index) => ({id, index, title, active: activeIndex.value === index})))

    const lastAccessed: number[] = []

    watch(activeIndex, (_, oldIndex) => {
        const lastId = views.value[oldIndex]?.id
        if(lastId !== undefined && lastAccessed.length > 0 && lastAccessed[lastAccessed.length - 1] !== lastId) {
            const existIdx = lastAccessed.indexOf(lastId)
            if(existIdx >= 0) lastAccessed.splice(existIdx, 1)
            lastAccessed.push(lastId)
            console.log("lastAccessed", lastAccessed)
        }
    }, {flush: "sync"})

    function newTab(args?: NewRoute) {
        const routeDef = getRouteDefinition(args?.routeName)
        const route: Route = args !== undefined ? {routeName: args.routeName, path: args.path, params: args.params ?? {}, initializer: args.initializer ?? {}} : {routeName: routeDef.routeName, path: undefined, params: {}, initializer: {}}
        const id = nextTabId()
        views.value.push({id, memoryStorage: {}, current: {historyId: nextHistoryId(), title: routeDef.defaultTitle ?? null, route, storage: {}}, histories: [], forwards: []})
        activeIndex.value = views.value.length - 1
        event.emit({type: "TabCreated", id})
    }

    function duplicateTab(args?: {id?: number, index?: number}) {
        const viewIndex = args?.index !== undefined ? args.index : args?.id !== undefined ? views.value.findIndex(v => v.id === args.id) : activeIndex.value
        const view = views.value[viewIndex]
        if(viewIndex >= 0 && view !== undefined) {
            const id = nextTabId()
            views.value.splice(viewIndex + 1, 0, {...objects.deepCopy(view), id})
            activeIndex.value = viewIndex + 1
            event.emit({type: "TabCreated", id})
        }
    }

    function activeTab(index: number) {
        if(index >= 0 && index < views.value.length) {
            activeIndex.value = index
            event.emit({type: "TabActiveChanged", id: views.value[index].id})
        }
    }

    function nextTab() {
        activeTab(activeIndex.value < views.value.length - 1 ? activeIndex.value + 1 : 0)
    }

    function prevTab() {
        activeTab(activeIndex.value > 0 ? activeIndex.value - 1 : views.value.length - 1)
    }

    function moveTab(args: {id?: number, index?: number, toIndex: number}) {
        const index = args.index !== undefined ? args.index : args.id !== undefined ? views.value.findIndex(v => v.id === args.id) : activeIndex.value
        if(index >= 0 && index < tabs.value.length && args.toIndex >= 0 && args.toIndex <= tabs.value.length && index !== args.toIndex) {
            if(args.toIndex > index) {
                views.value = [...views.value.slice(0, index), ...views.value.slice(index + 1, args.toIndex + 1), views.value[index], ...views.value.slice(args.toIndex + 1)]
                activeIndex.value = args.toIndex
            }else{
                views.value = [...views.value.slice(0, args.toIndex), views.value[index], ...views.value.slice(args.toIndex, index), ...views.value.slice(index + 1)]
                activeIndex.value = args.toIndex
            }
            event.emit({type: "TabMoved", id: views.value[activeIndex.value].id})
        }
    }

    function closeTab(args?: {id?: number, index?: number}) {
        const index = args?.index !== undefined ? args.index : args?.id !== undefined ? views.value.findIndex(v => v.id === args.id) : activeIndex.value
        if(index >= 0 && index < tabs.value.length) {
            const [view] = views.value.splice(index, 1)
            if(views.value.length <= 0) {
                window.close()
            }else if(lastAccessed.length > 0) {
                const viewInLA = lastAccessed.indexOf(view.id)
                if(viewInLA >= 0) lastAccessed.splice(viewInLA, 1)
                const id = lastAccessed.pop()
                const idx = id !== undefined ? views.value.findIndex(v => v.id === id) : -1
                activeIndex.value = idx >= 0 ? idx : activeIndex.value
            }else if(index < activeIndex.value || (index === activeIndex.value && activeIndex.value > 0)) {
                activeIndex.value -= 1
            }
            event.emit({type: "TabClosed", id: view.id})
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

    function routeBack() {
        const view = {value: views.value[activeIndex.value]}
        if(view.value.histories.length > 0) {
            const [history] = view.value.histories.splice(view.value.histories.length - 1, 1)
            view.value.forwards.push(view.value.current)
            if(view.value.forwards.length > historyMax) view.value.forwards.shift()
            view.value.current = history
            event.emit({type: "Routed", operation: "Back", id: view.value.id, historyId: view.value.current.historyId})
        }
    }

    function routeForward() {
        const view = {value: views.value[activeIndex.value]}
        if(view.value.forwards.length > 0) {
            const [forward] = view.value.forwards.splice(view.value.forwards.length - 1, 1)
            view.value.histories.push(view.value.current)
            if(view.value.histories.length > historyMax) view.value.histories.shift()
            view.value.current = forward
            event.emit({type: "Routed", operation: "Forward", id: view.value.id, historyId: view.value.current.historyId})
        }
    }

    useApplicationMenuTabs({newTab, duplicateTab, closeTab, nextTab, prevTab, routeBack, routeForward})

    return {tabs, activeTab, newTab, moveTab, closeTab, duplicateTab, newWindow}
}

export const [installCurrentTab, useCurrentTab] = installationNullable(function (props: {id: number, historyId: number}) {
    const { views, activeIndex, event } = useBrowserView()!

    const view = ref<InternalTab>(views.value.find(v => v.id === props.id)!)

    const page = ref<InternalPage>(view.value.current.historyId === props.historyId ? view.value.current : (view.value.histories.find(p => p.historyId === props.historyId) ?? view.value.forwards.find(p => p.historyId === props.historyId)!!))

    const activePage = ref(view.value.current.historyId === props.historyId)

    const activeTab = ref(views.value.findIndex(v => v.id === props.id) === activeIndex.value)

    const active = ref(activePage.value && activeTab.value)

    useListeningEvent(event, () => {
        activePage.value = view.value.current.historyId === props.historyId
        activeTab.value = views.value.findIndex(v => v.id === props.id) === activeIndex.value
        active.value = activePage.value && activeTab.value
    })

    return {view, page, active, activePage, activeTab}
})

export function isBrowserEnvironment() {
    const view = useBrowserView()
    return view !== undefined
}

export function useBrowserTabStacks() {
    const { views, activeIndex, event, matchStacks, loadComponent, getComponentOrNull } = useBrowserView()!

    const tabStacks = ref<BrowserTabStack[]>([])

    const generateTabStacks = async () => {
        const ret: BrowserTabStack[] = []
        for(let i = 0; i < views.value.length; i++) {
            const v = views.value[i]
            const component = await loadComponent(v.current.route.routeName)
            const prevStacks = (tabStacks.value[i]?.id === v.id ? tabStacks.value[i] : tabStacks.value.find(s => s.id === v.id))?.stacks
            const s = matchStacks(v, prevStacks).map(h => ({historyId: h.historyId, component: getComponentOrNull(h.route.routeName)!}))
            ret.push({id: v.id, stacks: [...s, {historyId: v.current.historyId, component}]})
        }
        tabStacks.value = ret
    }

    useListeningEvent(event, e => { if(e.type !== "TabActiveChanged") generateTabStacks().finally() })

    onBeforeMount(generateTabStacks)

    return {tabStacks, activeIndex}
}

export function useBrowserTabs(): BrowserTabs {
    return useBrowserView()!.browserTabs
}

function useBrowserRoute(view: Ref<InternalTab>, page?: Ref<InternalPage>): BrowserRoute {
    const { views, activeIndex, getRouteDefinition, nextHistoryId, historyMax, event } = useBrowserView()!

    const route = computed(() => page?.value.route ?? view.value.current.route)

    const histories = computed(() => view.value.histories)

    const forwards = computed(() => view.value.forwards)

    function routePush(route: NewRoute) {
        const routeDef = getRouteDefinition(route.routeName)
        view.value.forwards.splice(0, view.value.forwards.length)
        view.value.histories.push(view.value.current)
        if(view.value.histories.length > historyMax) view.value.histories.shift()
        view.value.current = {
            historyId: nextHistoryId(),
            title: routeDef.defaultTitle ?? null,
            route: {routeName: route.routeName, path: route.path, params: route.params ?? {}, initializer: route.initializer ?? {}},
            storage: {}
        }
        event.emit({type: "Routed", operation: "Push", id: view.value.id, historyId: view.value.current.historyId})
    }

    function routeReplace(route: NewRoute) {
        const routeDef = getRouteDefinition(route.routeName)
        view.value.current = {
            historyId: nextHistoryId(),
            title: routeDef.defaultTitle ?? null,
            route: {routeName: route.routeName, path: route.path, params: route.params ?? {}, initializer: route.initializer ?? {}},
            storage: {}
        }
        event.emit({type: "Routed", operation: "Replace", id: view.value.id, historyId: view.value.current.historyId})
    }

    function routeBack() {
        if(view.value.histories.length > 0) {
            const [history] = view.value.histories.splice(view.value.histories.length - 1, 1)
            view.value.forwards.push(view.value.current)
            if(view.value.forwards.length > historyMax) view.value.forwards.shift()
            view.value.current = history
            event.emit({type: "Routed", operation: "Back", id: view.value.id, historyId: view.value.current.historyId})
        }
    }

    function routeForward() {
        if(view.value.forwards.length > 0) {
            const [forward] = view.value.forwards.splice(view.value.forwards.length - 1, 1)
            view.value.histories.push(view.value.current)
            if(view.value.histories.length > historyMax) view.value.histories.shift()
            view.value.current = forward
            event.emit({type: "Routed", operation: "Forward", id: view.value.id, historyId: view.value.current.historyId})
        }
    }

    function routeClose() {
        if(page !== undefined && page.value.historyId !== view.value.current.historyId) {
            const index = view.value.histories.findIndex(p => p.historyId === page.value.historyId)
            if(index >= 0) view.value.histories.splice(index, 1)
            event.emit({type: "Routed", operation: "Close", id: view.value.id, historyId: view.value.current.historyId})
        }else if(view.value.histories.length > 0) {
            const [history] = view.value.histories.splice(view.value.histories.length - 1, 1)
            view.value.current = history
            event.emit({type: "Routed", operation: "Close", id: view.value.id, historyId: view.value.current.historyId})
        }else{
            const index = views.value.findIndex(v => v.id === view.value.id)
            if(index >= 0) {
                const [view] = views.value.splice(index, 1)
                if(views.value.length <= 0) {
                    window.close()
                }else if(index < activeIndex.value || (index === activeIndex.value && activeIndex.value > 0)) {
                    activeIndex.value -= 1
                }
                event.emit({type: "TabClosed", id: view.id})
            }
        }
    }

    return {route, histories, forwards, routePush, routeReplace, routeBack, routeForward, routeClose}
}

export function useActivateTabRoute(): BrowserRoute {
    const { views, activeIndex, event } = useBrowserView()!

    const view = ref<InternalTab>(views.value[activeIndex.value])

    useListeningEvent(event, e => {
        if(e.type === "TabActiveChanged" || e.type === "TabCreated" || e.type === "TabMoved" || e.type === "TabClosed") {
            view.value = views.value[activeIndex.value]
        }
    })

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

export function useDocumentTitle(titleChanged: Ref<string | {name: string} | {title: string} | {id: number} | null | undefined> | (() => (string | {name: string} | {title: string} | {id: number} | null | undefined))) {
    const document = useDocument()
    watch(titleChanged, tc => {
        if(tc !== null && tc !== undefined) {
            if(typeof tc === "string") {
                document.title.value = tc
            }else if(typeof tc === "object") {
                document.title.value = (tc as {name: string}).name || (tc as {title: string}).title || (tc as {id: number}).id.toString()
            }
        }
    }, {immediate: true})
}

export function useBrowserEvent(arg: (e: BrowserTabEvent) => void) {
    const { event } = useBrowserView()!
    useListeningEvent(event, arg)
}