import { computed, isReactive, isRef, reactive, ref, Ref, unref, watch } from "vue"
import { Router } from "vue-router"
import { MenuDefinition, SubMenuItemDefinition, MenuBadge } from "@/components/interaction"
import { installation, toReactiveArray } from "@/utils/reactivity"
import { BrowserRoute, NewRoute } from "@/modules/browser"
import { mapAnyPathToString } from "@/utils/router"
import { NavigationRecords } from "./side-nav-records"

/**
 * 侧边导航菜单栏功能服务。它提供一组快捷API将侧边栏的Menu作为导航功能使用，并支持动态生成一些菜单项。
 */
export interface SideNavMenu {
    menuItems: Readonly<Ref<MenuDefinition[]>>
    menuSelected: Ref<{id: string, subId: string | null} | undefined>
}

interface SideNavMenuOptions {
    router: Router | BrowserRoute
    navigationRecords: NavigationRecords
    menuItems: NavItem[]
}

type NavItem = NavScopeItem | NavMenuItem | NavItemSetup<GeneratedNavMenuItem>

interface NavScopeItem {
    type: "scope"
    scopeName: string
    label: string
}

interface NavMenuItem {
    type: "menu"
    routeName: string
    routePath?: {key: string, value: unknown}
    label: string
    icon: string
    badge?: Ref<MenuBadge> | MenuBadge
    submenu?: (NavSubMenuItem | NavItemSetup<NavSubMenuItem>)[]
}

export interface GeneratedNavMenuItem extends NavMenuItem {
    submenu?: NavSubMenuItem[]
}

export interface NavSubMenuItem {
    routeName: string
    routePath: {key: string, value: unknown}
    label: string
    badge?: Ref<MenuBadge> | MenuBadge
}

export interface NavItemSetup<T> {
    (): T[] | Ref<T[]>
}

export const [installNavMenu, useNavMenu] = installation(function (options: SideNavMenuOptions): SideNavMenu {
    const router = compatibleWithRouter(options.router)

    const groups = generateMenuDefinitionGroups(options.menuItems)

    const menuItems = generateRefFromReactiveGroup(groups)

    const innerMenuSelected = ref<{id: string, subId: string | null}>()

    watch(() => [router.route.value, menuItems.value] as const, ([route, menuItems]) => {
        //route变化时，根据route，查找当前应该选中的项。
        const { routeName, path: routePath } = route

        let newSelected: {id: string, subId: string | null} | undefined = undefined

        for(const menuItem of menuItems) {
           if(menuItem.type === "menu") {
               //tips: 此处的遍历算法使用了较为浪费的写法。
               //由于有些时候要匹配的子项实际位于总项之后，所以采用了全体遍历、后者优先的策略。
               //若有时间，应该优化这里的遍历算法。
               if(routePath !== undefined) {
                   const param = analyseRouteParamFromSelected({id: menuItem.id, subId: null})
                   if(matchSelectedWithRoute(param, routeName, routePath)) {
                        newSelected = {id: menuItem.id, subId: null}
                        //return
                   }

                   //如果hasPath，则尝试与submenu匹配
                   if(menuItem.submenu?.length) {
                       for(const submenuItem of menuItem.submenu) {
                           const param = analyseRouteParamFromSelected({id: menuItem.id, subId: submenuItem.id})
                           if(matchSelectedWithRoute(param, routeName, routePath)) {
                                newSelected = {id: menuItem.id, subId: submenuItem.id}
                                //return
                           }
                       }
                   }
               }else{
                   //如果非hasPath，则只与本体匹配，不尝试submenu，因为submenu必有path参数
                   const param = analyseRouteParamFromSelected({id: menuItem.id, subId: null})
                   if(matchSelectedWithRoute(param, routeName, routePath)) {
                        newSelected = {id: menuItem.id, subId: null}
                        //return
                   }
               }
           }
        }

        innerMenuSelected.value = newSelected
    }, {immediate: true})

    const menuSelected = computed({
        get: () => innerMenuSelected.value,
        set(selected) {
            if(selected !== undefined) {
                const param = analyseRouteParamFromSelected(selected)
                if(param.routePathKey !== null) {
                    //TODO: 将navRecords直接注入到navMenu来解决问题。但实现方式不太美观。
                    //      这么做产生了一个未在流程中说明的外部依赖，所有的path参数今后只能从navRecords中取值了。
                    //      这不是一种好的编码方式，因此以后也要重构这个模块。
                    const path = options.navigationRecords.records[param.routeName]?.find(i => i.id === param.routePathKey)?.path ?? param.routePathKey
                    router.routePush({routeName: param.routeName, path})
                }else{
                    router.routePush({routeName: param.routeName})
                }
            }
        }
    })

    return {menuItems, menuSelected}
})

function compatibleWithRouter(router: Router | BrowserRoute): {route: Readonly<Ref<{routeName: string, params: Record<string, any>, path: any}>>, routePush(route: NewRoute): void} {
    if((router as Router).currentRoute !== undefined) {
        const vueRouter = router as Router
        return {
            route: computed(() => ({routeName: vueRouter.currentRoute.value.name as string, params: vueRouter.currentRoute.value.query, path: vueRouter.currentRoute.value.params[Object.keys(vueRouter.currentRoute.value.params)[0]]})),
            routePush: route => vueRouter.push({name: route.routeName, query: route.params, params: route.path !== undefined ? {"detail": route.path as any} : undefined})
        }
    }else{
        return router as BrowserRoute
    }
}

/**
 * 将nav item的定义转换成成组的菜单项定义。
 * 相邻的静态项会被括成一组，动态项的结果自己作为一组。
 * 结果的组是reactive的。
 */
function generateMenuDefinitionGroups(menuItems: NavItem[]): MenuDefinition[][] {
    const groups = reactive<MenuDefinition[][]>([])

    let staticGroup: MenuDefinition[] = []
    for(const menuItem of menuItems) {
        if(typeof menuItem === "function") {
            if(staticGroup.length > 0) {
                groups.push(staticGroup)
                staticGroup = []
            }
            const dynamicMenuItem = menuItem()
            const dynamicGroup = isRef(dynamicMenuItem) || isReactive(dynamicMenuItem)
                ? toReactiveArray(computed(() => unref(dynamicMenuItem).map(mapGeneratedNavMenuItemToMenuDefinition)))
                : dynamicMenuItem.map(mapGeneratedNavMenuItemToMenuDefinition)
            groups.push(dynamicGroup)
        }else if(menuItem.type === "scope") {
            staticGroup.push({type: "scope", id: menuItem.scopeName, label: menuItem.label})
        }else{
            if(menuItem.submenu !== undefined && menuItem.submenu.length > 0) {
                const submenuGroups = generateSubMenuDefinitionGroups(menuItem.submenu)
                const submenu = generateRefFromReactiveGroup(submenuGroups)
                staticGroup.push(mapNavMenuItemToMenuDefinition(menuItem, submenu))
            }else{
                staticGroup.push(mapNavMenuItemToMenuDefinition(menuItem))
            }
        }
    }
    if(staticGroup.length > 0) {
        groups.push(staticGroup)
    }

    return groups
}

/**
 * 将nav sub item的定义转换成成组的菜单项定义。
 * 相邻的静态项会被括成一组，动态项的结果自己作为一组。
 * 结果的组是reactive的。
 */
function generateSubMenuDefinitionGroups(submenuItems: (NavSubMenuItem | NavItemSetup<NavSubMenuItem>)[]): SubMenuItemDefinition[][] {
    const groups = reactive<SubMenuItemDefinition[][]>([])

    let staticGroup: SubMenuItemDefinition[] = []
    for(const submenuItem of submenuItems) {
       if(typeof submenuItem === "function") {
           if(staticGroup.length > 0) {
               groups.push(staticGroup)
               staticGroup = []
           }
           const dynamicMenuItem = submenuItem()
           const dynamicGroup = isRef(dynamicMenuItem) || isReactive(dynamicMenuItem)
               ? toReactiveArray(computed(() => unref(dynamicMenuItem).map(mapNavSubMenuItemToMenuDefinition)))
               : dynamicMenuItem.map(mapNavSubMenuItemToMenuDefinition)
           groups.push(dynamicGroup)
       }else{
           staticGroup.push(mapNavSubMenuItemToMenuDefinition(submenuItem))
       }
    }
    if(staticGroup.length > 0) {
        groups.push(staticGroup)
    }

    return groups
}

/**
 * 将成组的菜单项定义平铺成数组。与上面的转换组函数结合使用，可以将定义转换为动态的菜单项定义列表。
 */
function generateRefFromReactiveGroup<T>(groups: T[][]): Ref<T[]> {
    const ret = ref<T[]>([]) as any as Ref<T[]>

    watch(() => groups, groups => ret.value = groups.flat(1), {deep: true, immediate: true})

    return ret
}

/**
 * 将一个生成的nav item定义映射为菜单项。
 */
function mapGeneratedNavMenuItemToMenuDefinition(item: GeneratedNavMenuItem): MenuDefinition {
    const id = item.routeName + (item.routePath !== undefined ? `/${item.routePath.key}` : "")
    const submenu = item.submenu?.map(mapNavSubMenuItemToMenuDefinition)
    return {type: "menu", id, label: item.label, icon: item.icon, submenu}
}

/**
 * 将一个nav item定义映射为菜单项。
 */
function mapNavMenuItemToMenuDefinition(item: NavMenuItem, submenu?: Ref<SubMenuItemDefinition[]>): MenuDefinition {
    const id = item.routeName + (item.routePath !== undefined ? `/${item.routePath.key}` : "")
    if(submenu !== undefined || item.badge !== undefined) {
        return reactive({type: "menu", id, label: item.label, icon: item.icon, badge: item.badge, submenu})
    }else{
        return {type: "menu", id, label: item.label, icon: item.icon}
    }
}

/**
 * 将一个nav sub item定义映射为菜单项。
 */
function mapNavSubMenuItemToMenuDefinition(item: NavSubMenuItem): SubMenuItemDefinition {
    const id = `${item.routeName}/${item.routePath.key}`
    if(item.badge !== undefined) {
        return reactive({id, label: item.label, badge: item.badge})
    }else{
        return {id, label: item.label}
    }
}

/**
 * 将selected的id和subId参数，按照生成时的生成规则，解析为routeName、routeQueryName、routeQueryValue等参数。
 */
function analyseRouteParamFromSelected(selected: {id: string, subId: string | null}): {routeName: string, routePathKey: string | null} {
    if(selected.subId !== null) {
        const qIdx = selected.subId.indexOf("/")
        if(qIdx >= 0) {
            const routeName = selected.subId.slice(0, qIdx)
            const routePathKey = selected.subId.slice(qIdx + 1)
            return {routeName, routePathKey}
        }
        return {routeName: selected.subId, routePathKey: null}
    }else{
        const qIdx = selected.id.indexOf("/")
        if(qIdx >= 0) {
            const routeName = selected.id.slice(0, qIdx)
            const routePathKey = selected.id.slice(qIdx + 1)
            return {routeName, routePathKey}
        }
        return {routeName: selected.id, routePathKey: null}
    }
}

/**
 * 检测selected param结果是否能与route参数正确匹配。
 * @param param 由analyseRouteParamFromSelected生成的结果
 * @param routeName route.name
 * @param routePath route.path
 */
function matchSelectedWithRoute(param: {routeName: string, routePathKey: string | null}, routeName: string, routePath: any): boolean {
    if(param.routeName === routeName) {
        if(param.routePathKey !== null) {
            if(mapAnyPathToString(routePath) === param.routePathKey) {
                return true
            }
        }else{
            return true
        }
    }
    return false
}
