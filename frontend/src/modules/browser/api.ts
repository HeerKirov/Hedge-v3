import { Component, DefineComponent, Ref, computed, markRaw, onBeforeMount, ref, watch, toRaw } from "vue"
import { useRoute } from "vue-router"
import { createLocalStorage } from "@/functions/app/storage"
import { useApplicationMenuTabs } from "@/functions/app/app-menu"
import { windowManager } from "@/modules/window"
import { arrays, objects } from "@/utils/primitives"
import { installationNullable } from "@/utils/reactivity"
import { useWindowEventListener } from "@/utils/sensors"
import { SendRefEmitter, useListeningEvent, useRefEmitter } from "@/utils/emitter"
import {
    BrowserDocument, BrowserRoute, BrowserTabStack, BrowserTabs, BrowserViewOptions, InternalPage,
    InternalTab, NewRoute, Route, RouteDefinition, Tab, BrowserTabEvent, BrowserClosedTabs
} from "./definition"
import { StackedViewContext } from "@/components-module/stackedview"

const PAGE_HISTORY_MAX = 10, HASH_HISTORY_MAX = 20, CLOSED_HISTORY_MAX = 15

export type BrowserViewContext = ReturnType<typeof installBrowserView>

export const [installBrowserView, useBrowserView] = installationNullable(function (options: BrowserViewOptions) {
    const vueRoute = useRoute()

    const defaultRouteDefinition = options.routes[0]
    const routeMaps = arrays.toTupleMap(options.routes, route => [route.routeName, route])
    const guardEnterMaps = arrays.groupByTuple(options.guardDefinitions?.filter(it => !!it.beforeEnter)?.flatMap(i => typeof i.routeName === "string" ? [[i.routeName, i.beforeEnter!!] as const] : i.routeName.map(n => [n, i.beforeEnter!!] as const)) ?? [], g => g)
    const guardLeaveMaps = arrays.groupByTuple(options.guardDefinitions?.filter(it => !!it.beforeLeave)?.flatMap(i => typeof i.routeName === "string" ? [[i.routeName, i.beforeLeave!!] as const] : i.routeName.map(n => [n, i.beforeLeave!!] as const)) ?? [], g => g)
    const componentCaches: Record<string, Component | DefineComponent> = {}

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

    function getGuardDefinition(routeName: string, direction: "enter" | "leave"): ((a: Route, b: Route) => Route | void) | undefined {
        const list = direction === "enter" ? guardEnterMaps[routeName] : guardLeaveMaps[routeName]
        if(list) {
            if(list.length === 1) {
                return list[0]
            }else{
                return (a, b) => {
                    let x = a
                    for(const func of list) {
                        x = func(x, b) ?? x
                    }
                    return x
                }
            }
        }
        return undefined
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

            views.value.push({id: nextTabId(), memoryStorage: {}, current: {historyId: nextHistoryId(), title: routeDef.defaultTitle ?? null, defaultTitle: routeDef.defaultTitle ?? null, route, storage: {}, histories: [], forwards: []}, histories: [], forwards: []})
        }else{
            const routeDef = getRouteDefinition()
            const route: Route = {routeName: routeDef.routeName, path: undefined, params: {}, initializer: {}}

            views.value.push({id: nextTabId(), memoryStorage: {}, current: {historyId: nextHistoryId(), title: routeDef.defaultTitle ?? null, defaultTitle: routeDef.defaultTitle ?? null, route, storage: {}, histories: [], forwards: []}, histories: [], forwards: []})
        }
    })

    const closedTabs = installClosedTabs(views, activeIndex, nextTabId, nextHistoryId, event, defaultRouteDefinition)

    const browserTabs = installBrowserTabs(views, activeIndex, getRouteDefinition, nextTabId, nextHistoryId, event, options.stackedView)

    useApplicationMenuTabs({newTab: browserTabs.newTab, duplicateTab: browserTabs.duplicateTab, closeTab: browserTabs.closeTab, nextTab: browserTabs.nextTab, prevTab: browserTabs.prevTab, routeBack: browserTabs.routeBack, routeForward: browserTabs.routeForward, resumeTab: closedTabs.resume})

    return {views, activeIndex, event, nextTabId, nextHistoryId, matchStacks, getRouteDefinition, getGuardDefinition, loadComponent, getComponentOrNull, browserTabs, closedTabs}
})

function installBrowserTabs(views: Ref<InternalTab[]>,
                            activeIndex: Ref<number>,
                            getRouteDefinition: (routeName?: string) => RouteDefinition,
                            nextTabId: () => number,
                            nextHistoryId: () => number,
                            event: SendRefEmitter<BrowserTabEvent>,
                            stackedViewContext: StackedViewContext | undefined): BrowserTabs {
    const tabs = computed<Tab[]>(() => views.value.map(({ id, current: { title } }, index) => ({id, index, title, active: activeIndex.value === index})))

    const lastAccessed: number[] = []

    watch(activeIndex, (_, oldIndex) => {
        const lastId = views.value[oldIndex]?.id
        if(lastId !== undefined && (lastAccessed.length <= 0 || lastAccessed[lastAccessed.length - 1] !== lastId)) {
            const existIdx = lastAccessed.indexOf(lastId)
            if(existIdx >= 0) lastAccessed.splice(existIdx, 1)
            lastAccessed.push(lastId)
        }
    }, {flush: "sync"})

    function newTab(args?: NewRoute) {
        const routeDef = getRouteDefinition(args?.routeName)
        const route: Route = args !== undefined ? {routeName: args.routeName, path: args.path, params: args.params ?? {}, initializer: args.initializer ?? {}} : {routeName: routeDef.routeName, path: undefined, params: {}, initializer: {}}
        const id = nextTabId()
        views.value.push({id, memoryStorage: {}, current: {historyId: nextHistoryId(), title: routeDef.defaultTitle ?? null, defaultTitle: routeDef.defaultTitle ?? null, route, storage: {}, histories: [], forwards: []}, histories: [], forwards: []})
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
            }else{
                if(lastAccessed.length > 0) {
                    //在lastAccessed不为空时，从此列表移除被关闭的页面
                    const viewInLA = lastAccessed.indexOf(view.id)
                    if(viewInLA >= 0) lastAccessed.splice(viewInLA, 1)
                }
                if(index === activeIndex.value) {
                    //如果被关闭的页面就是当前激活的页面，则首先尝试从lastAccessed获取最后访问项
                    const id = lastAccessed.pop()
                    const idx = id !== undefined ? views.value.findIndex(v => v.id === id) : -1
                    if(idx >= 0) {
                        //能获取最后访问项时，切换至该项激活
                        activeIndex.value = idx
                    }else if(activeIndex.value > 0) {
                        //如果不能获得最后访问项，便切换至前一项，表现为activeIndex-1，除非现在就是第一项
                        activeIndex.value -= 1
                    }
                }else if(index < activeIndex.value) {
                    //如果被关闭的页面不是当前激活页面，那么当被关闭页面在当前页面之前时，需要让activeIndex-1，因为页面数组发生了缩减，否则则不需要变动
                    activeIndex.value -= 1
                }
            }
            event.emit({type: "TabClosed", tab: toRaw(view)})
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
        if(stackedViewContext) {
            if(!stackedViewContext.isRootView && stackedViewContext.current.value !== null) {
                stackedViewContext.closeView()
                return
            }
        }
        const view = {value: views.value[activeIndex.value]}
        if(view.value.current.histories.length > 0) {
            //在存在hash历史的情况下，先迭代hash历史
            const [history] = view.value.current.histories.splice(view.value.current.histories.length - 1, 1)
            view.value.current.forwards.push({title: view.value.current.title, params: view.value.current.route.params})
            view.value.current.title = history.title
            view.value.current.route.params = history.params
            event.emit({type: "Routed", operation: "Back", id: view.value.id, historyId: view.value.current.historyId})
        }else if(view.value.histories.length > 0) {
            const [history] = view.value.histories.splice(view.value.histories.length - 1, 1)
            view.value.forwards.push(view.value.current)
            if(view.value.forwards.length > PAGE_HISTORY_MAX) view.value.forwards.shift()
            view.value.current = history
            event.emit({type: "Routed", operation: "Back", id: view.value.id, historyId: view.value.current.historyId})
        }
    }

    function routeForward() {
        const view = {value: views.value[activeIndex.value]}
        if(view.value.current.forwards.length > 0) {
            const [forward] = view.value.current.forwards.splice(view.value.current.forwards.length - 1, 1)
            view.value.current.histories.push({title: view.value.current.title, params: view.value.current.route.params})
            view.value.current.title = forward.title
            view.value.current.route.params = forward.params
            event.emit({type: "Routed", operation: "Forward", id: view.value.id, historyId: view.value.current.historyId})
        }else if(view.value.forwards.length > 0) {
            const [forward] = view.value.forwards.splice(view.value.forwards.length - 1, 1)
            view.value.histories.push(view.value.current)
            if(view.value.histories.length > PAGE_HISTORY_MAX) view.value.histories.shift()
            view.value.current = forward
            event.emit({type: "Routed", operation: "Forward", id: view.value.id, historyId: view.value.current.historyId})
        }
    }

    return {tabs, activeTab, newTab, moveTab, closeTab, duplicateTab, nextTab, prevTab, routeBack, routeForward, newWindow}
}

function installClosedTabs(views: Ref<InternalTab[]>,
                           activeIndex: Ref<number>,
                           nextTabId: () => number,
                           nextHistoryId: () => number,
                           event: SendRefEmitter<BrowserTabEvent>,
                           defaultRouteDefinition: RouteDefinition): BrowserClosedTabs {
    const localStorage = createLocalStorage<InternalTab[]>("browser/closed-tabs")

    const closedTabs: InternalTab[] = localStorage.get() ?? []

    function record(closedTab: InternalTab) {
        function mapPage(page: InternalPage): InternalPage {
            return {historyId: page.historyId, title: page.title, defaultTitle: page.defaultTitle, storage: {}, route: page.route, histories: page.histories, forwards: page.forwards}
        }

        function mapTab(tab: InternalTab): InternalTab {
            return {id: tab.id, memoryStorage: {}, current: mapPage(tab.current), histories: tab.histories.map(mapPage), forwards: tab.forwards.map(mapPage)}
        }

        closedTabs.push(mapTab(closedTab))

        if(closedTabs.length > CLOSED_HISTORY_MAX) closedTabs.shift()
    }

    function tabs(): Readonly<(string | null)[]> {
        return closedTabs.toReversed().map(i => i.current.title)
    }

    function resume(index: number = 0) {
        if(index >= 0 && index < closedTabs.length) {
            //由于tabs对外提供的列表是反向的，所以此处的index也要反向
            const [tab] = closedTabs.splice(closedTabs.length - index - 1, 1)

            const id = nextTabId()
            views.value.push({...tab, id, current: {...tab.current, historyId: nextHistoryId()}})
            activeIndex.value = views.value.length - 1
            event.emit({type: "TabCreated", id})
        }
    }

    useListeningEvent(event, e => {
        if(e.type === "TabClosed") {
            record(e.tab)
        }
    })

    useWindowEventListener("beforeunload", () => {
        //在窗口关闭之前，会将当前选项卡列表写入closed列表，但是丢弃其所有导航历史，仅保留当前状态
        for(const internalTab of views.value) {
            if(internalTab.current.route.routeName !== defaultRouteDefinition.routeName) {
                closedTabs.push({id: internalTab.id, memoryStorage: {}, current: {historyId: internalTab.current.historyId, route: internalTab.current.route, storage: {}, title: internalTab.current.title, defaultTitle: internalTab.current.defaultTitle, histories: [], forwards: []}, histories: [], forwards: []})
            }
        }
        localStorage.set(closedTabs)
    })

    return {tabs, resume}
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

export function useClosedTabs(): BrowserClosedTabs {
    return useBrowserView()!.closedTabs
}

function useBrowserRoute(view: Ref<InternalTab>, page?: Ref<InternalPage>): BrowserRoute {
    const { browserTabs, getRouteDefinition, getGuardDefinition, nextHistoryId, event } = useBrowserView()!

    const route = computed(() => page?.value.route ?? view.value.current.route)

    const hasHistories = computed(() => view.value.current.histories.length > 0 || view.value.histories.length > 0)

    const hasForwards = computed(() => view.value.current.forwards.length > 0 || view.value.forwards.length > 0)

    function getHistories(limit: number = 20) {
        const returns: {title: string | null, i: number | null, j: number | null}[] = []
        for(let j = view.value.current.histories.length - 1; j >= 0; j--) {
            returns.push({title: view.value.current.histories[j].title, i: null, j})
            if(returns.length >= limit) break
        }
        if(returns.length < limit) {
            loop: for(let i = view.value.histories.length - 1; i >= 0; i--) {
                const page = view.value.histories[i]
                returns.push({title: page.title, i, j: null})
                if(returns.length >= limit) break
                for(let j = page.histories.length - 1; j >= 0; j--) {
                    returns.push({title: page.histories[j].title, i, j})
                    if(returns.length >= limit) break loop
                }
            }
        }
        return returns
    }

    function getForwards(limit: number = 20) {
        const returns: {title: string | null, i: number | null, j: number | null}[] = []
        for(let j = 0; j < view.value.current.forwards.length; j++) {
            returns.push({title: view.value.current.forwards[j].title, i: null, j})
            if(returns.length >= limit) break
        }
        if(returns.length < limit) {
            loop: for(let i = 0; i < view.value.forwards.length; i++) {
                const page = view.value.forwards[i]
                returns.push({title: page.title, i, j: null})
                if(returns.length >= limit) break
                for(let j = 0; j < page.forwards.length; j++) {
                    returns.push({title: page.forwards[j].title, i, j})
                    if(returns.length >= limit) break loop
                }
            }
        }
        return returns
    }

    function routePush(route: NewRoute, disableGuard?: "DISABLE_LEAVE" | "DISABLE") {
        const nextRoute = {routeName: route.routeName, path: route.path, params: route.params ?? {}, initializer: route.initializer ?? {}}
        if(disableGuard !== "DISABLE_LEAVE" && disableGuard !== "DISABLE") {
            const guardLeaveResult = getGuardDefinition(view.value.current.route.routeName, "leave")?.(view.value.current.route, nextRoute)
            if(guardLeaveResult !== undefined) {
                routePush(guardLeaveResult, guardLeaveResult.routeName === nextRoute.routeName && objects.deepEquals(guardLeaveResult.path, nextRoute.path) ? "DISABLE_LEAVE" : undefined)
                return
            }
        }
        if(disableGuard !== "DISABLE") {
            const guardEnterResult = getGuardDefinition(route.routeName, "enter")?.(nextRoute, view.value.current.route)
            if(guardEnterResult !== undefined) {
                routePush(guardEnterResult, guardEnterResult.routeName === nextRoute.routeName && objects.deepEquals(guardEnterResult.path, nextRoute.path) ? "DISABLE" : "DISABLE_LEAVE")
                return
            }
        }

        if(view.value.current.route.routeName === route.routeName && objects.deepEquals(view.value.current.route.path, route.path)) {
            //在routePush的路由是同一个的情况下，视作hash push，记录params的变更
            const current = view.value.current
            current.forwards.splice(0, current.forwards.length)
            current.histories.push({title: current.title, params: current.route.params})
            if(current.histories.length > HASH_HISTORY_MAX) current.histories.shift()
            current.route.params = route.params ?? {}
        }else{
            const routeDef = getRouteDefinition(route.routeName)
            if(view.value.forwards.length > 0) view.value.forwards.splice(0, view.value.forwards.length)
            if(view.value.current.forwards.length > 0) view.value.current.forwards.splice(0, view.value.current.forwards.length)
            view.value.histories.push(view.value.current)
            if(view.value.histories.length > PAGE_HISTORY_MAX) view.value.histories.shift()
            view.value.current = {
                historyId: nextHistoryId(),
                title: routeDef.defaultTitle ?? null,
                defaultTitle: routeDef.defaultTitle ?? null,
                route: nextRoute,
                storage: {},
                histories: [], forwards: []
            }
            event.emit({type: "Routed", operation: "Push", id: view.value.id, historyId: view.value.current.historyId})
        }
    }

    function routeReplace(route: NewRoute, disableGuard?: "DISABLE_LEAVE") {
        const nextRoute = {routeName: route.routeName, path: route.path, params: route.params ?? {}, initializer: route.initializer ?? {}}
        if(disableGuard !== "DISABLE_LEAVE") {
            const guardLeaveResult = getGuardDefinition(view.value.current.route.routeName, "leave")?.(view.value.current.route, nextRoute)
            if(guardLeaveResult !== undefined) {
                routePush(guardLeaveResult, guardLeaveResult.routeName === nextRoute.routeName && objects.deepEquals(guardLeaveResult.path, nextRoute.path) ? "DISABLE_LEAVE" : undefined)
                return
            }
        }
        const guardEnterResult = getGuardDefinition(route.routeName, "enter")?.(nextRoute, view.value.current.route)
        if(guardEnterResult !== undefined) {
            routePush(guardEnterResult, guardEnterResult.routeName === nextRoute.routeName && objects.deepEquals(guardEnterResult.path, nextRoute.path) ? "DISABLE" : "DISABLE_LEAVE")
            return
        }

        if(view.value.current.route.routeName === route.routeName && objects.deepEquals(view.value.current.route.path, route.path) && (!route.initializer || Object.keys(route.initializer).length <= 0)) {
            //在routePush的路由是同一个的情况下，视作hash push，记录params的变更
            const current = view.value.current
            current.route.params = route.params ?? {}
        }else{
            const routeDef = getRouteDefinition(route.routeName)
            view.value.current = {
                historyId: nextHistoryId(),
                title: routeDef.defaultTitle ?? null,
                defaultTitle: routeDef.defaultTitle ?? null,
                route: {routeName: route.routeName, path: route.path, params: route.params ?? {}, initializer: route.initializer ?? {}},
                storage: {},
                histories: [], forwards: []
            }
            event.emit({type: "Routed", operation: "Replace", id: view.value.id, historyId: view.value.current.historyId})
        }
    }

    function routeBack() {
        if(view.value.current.histories.length > 0) {
            //在存在hash历史的情况下，先迭代hash历史
            const [history] = view.value.current.histories.splice(view.value.current.histories.length - 1, 1)
            view.value.current.forwards.splice(0, 0, {title: view.value.current.title, params: view.value.current.route.params})
            view.value.current.title = history.title
            view.value.current.route.params = history.params
        }else if(view.value.histories.length > 0) {
            const [history] = view.value.histories.splice(view.value.histories.length - 1, 1)
            view.value.forwards.splice(0, 0, view.value.current)
            view.value.current = history
            event.emit({type: "Routed", operation: "Back", id: view.value.id, historyId: view.value.current.historyId})
        }
    }

    function routeForward() {
        if(view.value.current.forwards.length > 0) {
            const [forward] = view.value.current.forwards.splice(0, 1)
            view.value.current.histories.push({title: view.value.current.title, params: view.value.current.route.params})
            view.value.current.title = forward.title
            view.value.current.route.params = forward.params
        }else if(view.value.forwards.length > 0) {
            const [forward] = view.value.forwards.splice(0, 1)
            view.value.histories.push(view.value.current)
            view.value.current = forward
            event.emit({type: "Routed", operation: "Forward", id: view.value.id, historyId: view.value.current.historyId})
        }
    }

    function routeHistoryTo(direction: "back" | "forward", pageIndex: number | null, hashIndex: number | null): void {
        if(pageIndex === null) {
            //此次导航仅在当前页面的hash内进行
            if(direction === "back") {
                const [history, ...items] = view.value.current.histories.splice(hashIndex!, view.value.current.histories.length - hashIndex!)
                view.value.current.forwards.splice(0, 0, ...items, {title: view.value.current.title, params: view.value.current.route.params})
                view.value.current.title = history.title
                view.value.current.route.params = history.params
            }else{
                const items = view.value.current.forwards.splice(0, hashIndex! + 1)
                const forward = items.pop()!
                view.value.current.histories.push({title: view.value.current.title, params: view.value.current.route.params}, ...items)
                view.value.current.title = forward.title
                view.value.current.route.params = forward.params
            }
        }else{
            //此次导航跨Page
            if(direction === "back") {
                //如果当前页面仍有back hash，则全部压入forward
                if(view.value.current.histories.length > 0) routeHistoryTo("back", null, 0)

                const [history, ...items] = view.value.histories.splice(pageIndex, view.value.histories.length - pageIndex)
                view.value.forwards.splice(0, 0, ...items, view.value.current)
                view.value.current = history

                //如果有hashIndex，在此处处理
                if(hashIndex !== null) routeHistoryTo("back", null, hashIndex)

                event.emit({type: "Routed", operation: "Back", id: view.value.id, historyId: view.value.current.historyId})
            }else{
                //如果当前页面仍有forward hash，则全部压入back
                if(view.value.current.forwards.length > 0) routeHistoryTo("forward", null, view.value.current.forwards.length - 1)

                const items = view.value.forwards.splice(0, pageIndex + 1)
                const forward = items.pop()!
                view.value.histories.push(view.value.current, ...items)
                view.value.current = forward

                //如果有hashIndex，在此处处理
                if(hashIndex !== null) routeHistoryTo("forward", null, hashIndex)

                event.emit({type: "Routed", operation: "Back", id: view.value.id, historyId: view.value.current.historyId})
            }
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
            browserTabs.closeTab({id: view.value.id})
        }
    }

    return {route, getHistories, getForwards, hasHistories, hasForwards, routePush, routeReplace, routeBack, routeForward, routeHistoryTo, routeClose}
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

    const defaultTitle = () => page.value.defaultTitle

    return {title, defaultTitle}
}

type DocumentTitleChanged = Ref<string | (string | null | undefined)[] | {name: string} | {title: string} | {id: number} | null | undefined> | (() => (string | (string | null | undefined)[] | {name: string} | {title: string} | {id: number} | null | undefined))

type DocumentTitleOptions = {asPrefix?: boolean, asSuffix?: boolean, separator?: string}

export function useDocumentTitle(titleChanged: DocumentTitleChanged, { asPrefix = false, asSuffix = false, separator = " - "}: DocumentTitleOptions = {}) {
    const document = useDocument()

    function generateTitle(tc: string | (string | null | undefined)[] | {name: string} | {title: string} | {id: number} | null | undefined): string | null {
        if(tc !== null && tc !== undefined) {
            if(typeof tc === "string") {
                return tc
            }else if(typeof tc === "object") {
                if(tc instanceof Array) {
                    return tc.length > 0 ? tc.filter(i => i !== null && i !== undefined).join(separator) : null
                }else{
                    return (tc as {name: string}).name || (tc as {title: string}).title || (tc as {id: number}).id.toString()
                }
            }else{
                throw new Error(`Unsupported documentTitle type: ${typeof tc}`)
            }
        }
        return null
    }

    watch(titleChanged, tc => {
        const title = generateTitle(tc)
        if(asPrefix) {
            document.title.value = title !== null ? title + separator + document.defaultTitle() : document.defaultTitle()
        }else if(asSuffix) {
            document.title.value = title !== null ? document.defaultTitle() + separator + title : document.defaultTitle()
        }else{
            document.title.value = title ?? document.defaultTitle()
        }
    }, {immediate: true})
}

export function useBrowserEvent(arg: (e: BrowserTabEvent) => void) {
    const { event } = useBrowserView()!
    useListeningEvent(event, arg)
}