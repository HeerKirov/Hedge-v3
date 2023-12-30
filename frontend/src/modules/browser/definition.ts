import { Component, DefineComponent, Ref } from "vue"

export interface BrowserViewOptions {
    /**
     * 定义所有页面的路由信息。
     */
    routes: RouteDefinition[]
}

export interface RouteDefinition {
    /**
     * 路由名称。
     */
    routeName: string
    /**
     * 组件。
     */
    component: () => Promise<Component | DefineComponent>
    /**
     * 此页面的默认标题。
     */
    defaultTitle?: string
}

export interface BrowserTabs {
    /**
     * 现存的所有标签页。
     */
    tabs: Readonly<Ref<Tab[]>>
    /**
     * 激活目标标签页。
     */
    activeTab(index: number): void
    /**
     * 创建一个新的标签页。
     * @param args 新标签页的路由信息。不指定此信息则导航到主页。
     */
    newTab(args?: NewRoute): void
    /**
     * 移动一个标签页。
     * @param args 提供id或index，以指明要关闭的标签页。以及提供toIndex，以指明要移动到的顺序位置。
     */
    moveTab(args: {id?: number, index?: number, toIndex: number}): void
    /**
     * 复制一个标签页。复制时，克隆上一个标签页的所有路由数据和storage数据。
     */
    duplicateTab(args: {id?: number, index?: number}): void
    /**
     * 关闭一个标签页。
     * @param args 提供id或index，以指明要关闭的标签页。
     */
    closeTab(args: {id?: number, index?: number}): void
    /**
     * 创建一个新窗口。
     */
    newWindow(args?: NewRoute): void
}

export interface BrowserRoute {
    /**
     * 当前页面的当前路由信息。是页面的路由信息而不是标签页的，因此在Page内使用时，它将是当前page的路由信息。
     */
    route: Readonly<Ref<Route>>
    /**
     * 当前标签页的历史记录列表。
     */
    histories: Readonly<Ref<HistoryRecord[]>>
    /**
     * 当前标签页的前进列表。
     */
    forwards: Readonly<Ref<HistoryRecord[]>>
    /**
     * 当前标签页导航到指定的路由。
     */
    routePush(route: NewRoute): void
    /**
     * 当前标签页重定向到指定的路由，现在的页面不会留下历史记录。
     */
    routeReplace(route: NewRoute): void
    /**
     * 后退一条历史记录。
     */
    routeBack(): void
    /**
     * 前进一条历史记录。
     */
    routeForward(): void
}

export interface BrowserDocument {
    /**
     * 当前标签页的标题。这是一个可更改的选项，可以由标签页内部动态地更改它。
     */
    title: Ref<string | null>
}

export interface HistoryRecord {
    /**
     * 历史记录的标题。
     */
    title: string | null
    /**
     * 该历史记录的路由信息。
     */
    route: Route
}

export interface Tab {
    /**
     * 唯一定位ID，一个标签页的id在其生命周期内不会变化。
     */
    id: number
    /**
     * 该标签页当前在标签页列表中的排序下标。
     */
    index: number
    /**
     * 该标签页是否处于激活状态。同时只能有一个标签页处于激活态。
     */
    active: boolean
    /**
     * 该标签页的标题。
     */
    title: string | null
}

export interface Route {
    /**
     * 目标路由名称。
     */
    routeName: string
    /**
     * 如果目标路由带有path参数，则用此参数指定。
     */
    path: any | undefined
    /**
     * 提供给目标路由的query参数。这些参数是持久性的状态。
     */
    params: Record<string, any>
    /**
     * 提供给目标路由的params参数。这些参数不是持久性的状态值，它们只会在路由到页面后被一次性提供给侦听器，不会在历史记录中保留。
     */
    initializer: Record<string, any>
}

export type NewRoute = Partial<Route> & { routeName: string }

export interface InternalTab extends InternalPage {
    id: number
    memoryStorage: Record<string, any>
    histories: InternalPage[]
    forwards: InternalPage[]
}

export interface InternalPage {
    historyId: number
    title: string | null
    route: Route
    storage: Record<string, any>
}

export interface BrowserTabStack {
    id: number
    stacks: {historyId: number, component: Component | DefineComponent}[]
}