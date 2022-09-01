export type { RouteName, RouteParameter } from "./definitions"
export { useRouterNavigator, useNewWindowRouteReceiver } from "./navigator"
export { installRouterParamManager, useRouterParamEvent } from "./param"
export { useRouterQuery, useRouterQueryString, useRouterQueryNumber, useRouterQueryLocalDate } from "./query"

/*
 * == router 模块 ==
 * 此模块是一个增强router模块，为规范化页面跳转而设计。它的主要工作包括：
 * - 结合业务，定义所有业务页面所需的跳转参数。同时，还可以传递无法在vue-router模块中传递的增强参数。
 * - 根据跳转参数，提供一套函数，用于规范跳转。
 * - 提供一条composition API，用于被转到页面规范地获取跳转参数和增强参数，用作自己的初始化。
 * - 在业务的index索引页面响应来自URL任意类型的跳转需要。
 * 不过也不是所有页面都需要它，因为它的主要目的还是解决规范参数传递问题。那些无参数/无URL跳转需要的页面则不会在这里被定义。
 */
