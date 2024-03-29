export type { BrowserViewOptions, BrowserDocument, BrowserRoute, BrowserTabStack, BrowserTabs, Tab, InternalTab, NewRoute, RouteDefinition } from "./definition"
export { installBrowserView, installCurrentTab, isBrowserEnvironment, useBrowserTabStacks, useBrowserTabs, useActivateTabRoute, useTabRoute, useCurrentTab, useDocumentTitle, useBrowserEvent } from "./api"
export { useParam, usePath, useInitializer } from "./router"

/*
 * == Browser模块 ==
 * 此模块是综合了导航、历史记录、多选项卡功能的综合视图管理模块，因此直接称之为浏览器模块。
 * 它在Main页面代替了默认的vueRouter实现上述功能。
 */

