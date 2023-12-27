export type { BrowserViewOptions, BrowserDocument, BrowserRoute, BrowserStackView, BrowserTabs, Tab } from "./definition"
export { installBrowserView, installCurrentTab, useBrowserStackViews, useBrowserTabs, useActivateTabRoute, useTabRoute, useCurrentTab, useDocument } from "./api"

/*
 * == Browser模块 ==
 * 此模块是综合了导航、历史记录、多选项卡功能的综合视图管理模块，因此直接称之为浏览器模块。
 * 它在Main页面代替了默认的vueRouter实现上述功能。
 */

