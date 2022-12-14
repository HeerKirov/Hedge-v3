import { computed, isReactive, isRef, reactive, ref, Ref, unref, watch } from "vue"
import { LocationQuery, RouteRecordName, useRouter } from "vue-router"
import { MenuDefinition, SubMenuItemDefinition } from "@/components/interaction"
import { installation, toReactiveArray } from "@/utils/reactivity"

/**
 * 侧边导航菜单栏功能服务。它提供一组快捷API将侧边栏的Menu作为导航功能使用，并支持动态生成一些菜单项。
 */
export interface SideNavMenu {
    menuItems: Readonly<Ref<MenuDefinition[]>>
    menuSelected: Ref<{id: string, subId: string | null} | undefined>
}

interface SideNavMenuOptions {
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
    routeQueryName?: string
    routeQueryValue?: string
    label: string
    icon: string
    submenu?: (NavSubMenuItem | NavItemSetup<NavSubMenuItem>)[]
}

export interface GeneratedNavMenuItem extends NavMenuItem {
    submenu?: NavSubMenuItem[]
}

export interface NavSubMenuItem {
    routeQueryName: string
    routeQueryValue: string
    label: string
}

export interface NavItemSetup<T> {
    (): T[] | Ref<T[]>
}

export const [installNavMenu, useNavMenu] = installation(function (options: SideNavMenuOptions): SideNavMenu {
    const router = useRouter()

    const groups = generateMenuDefinitionGroups(options.menuItems)

    const menuItems = generateRefFromReactiveGroup(groups)

    const menuSelected = ref<{id: string, subId: string | null}>()

    watch(router.currentRoute, route => {
        //route变化时，根据route，查找当前应该选中的项。
        const { name: routeName, query: routeQuery } = route
        const hasQuery = Object.keys(routeQuery).length > 0

        for(const menuItem of menuItems.value) {
           if(menuItem.type === "menu") {
               if(hasQuery) {
                   //如果hasQuery，则调整优先级，率先尝试与submenu匹配，其次再尝试本体
                   if(menuItem.submenu?.length) {
                       for(const submenuItem of menuItem.submenu) {
                           const param = analyseRouteParamFromSelected({id: menuItem.id, subId: submenuItem.id})
                           if(matchSelectedWithRoute(param, routeName, routeQuery)) {
                               menuSelected.value = {id: menuItem.id, subId: submenuItem.id}
                               return
                           }
                       }
                   }

                   const param = analyseRouteParamFromSelected({id: menuItem.id, subId: null})
                   if(matchSelectedWithRoute(param, routeName, routeQuery)) {
                       menuSelected.value = {id: menuItem.id, subId: null}
                       return
                   }
               }else{
                   //如果非hasQuery，则只与本体匹配，不尝试submenu，因为submenu必有query参数
                   const param = analyseRouteParamFromSelected({id: menuItem.id, subId: null})
                   if(matchSelectedWithRoute(param, routeName, routeQuery)) {
                       menuSelected.value = {id: menuItem.id, subId: null}
                       return
                   }
               }

           }
        }
    }, {immediate: true})

    watch(menuSelected, selected => {
        if(selected !== undefined) {
            const param = analyseRouteParamFromSelected(selected)
            if(param.routeQueryName !== null) {
                router.push({name: param.routeName, query: {[param.routeQueryName]: param.routeQueryValue}}).finally()
            }else{
                router.push({name: param.routeName}).finally()
            }
        }
    })

    return {menuItems, menuSelected}
})

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
    const id = item.routeName + (item.routeQueryName !== undefined && item.routeQueryValue !== undefined ? `?${item.routeQueryName}=${item.routeQueryValue}` : "")
    const submenu = item.submenu?.map(mapNavSubMenuItemToMenuDefinition)
    return {type: "menu", id, label: item.label, icon: item.icon, submenu}
}

/**
 * 将一个nav item定义映射为菜单项。
 */
function mapNavMenuItemToMenuDefinition(item: NavMenuItem, submenu?: Ref<SubMenuItemDefinition[]>): MenuDefinition {
    const id = item.routeName + (item.routeQueryName !== undefined && item.routeQueryValue !== undefined ? `?${item.routeQueryName}=${item.routeQueryValue}` : "")
    if(submenu !== undefined) {
        return reactive({type: "menu", id, label: item.label, icon: item.icon, submenu})
    }else{
        return {type: "menu", id, label: item.label, icon: item.icon}
    }
}

/**
 * 将一个nav sub item定义映射为菜单项。
 */
function mapNavSubMenuItemToMenuDefinition(item: NavSubMenuItem): SubMenuItemDefinition {
    return {id: `${item.routeQueryName}=${item.routeQueryValue}`, label: item.label}
}

/**
 * 将selected的id和subId参数，按照生成时的生成规则，解析为routeName、routeQueryName、routeQueryValue等参数。
 */
function analyseRouteParamFromSelected(selected: {id: string, subId: string | null}): {routeName: string, routeQueryName: null, routeQueryValue: null} | {routeName: string, routeQueryName: string, routeQueryValue: string} {
    if(selected.subId !== null) {
        const [routeQueryName, routeQueryValue] = selected.subId.split("=", 2)
        return {routeName: selected.id, routeQueryName, routeQueryValue}
    }
    const qIdx = selected.id.indexOf("?")
    if(qIdx >= 0) {
        const routeName = selected.id.slice(0, qIdx)
        const [routeQueryName, routeQueryValue] = selected.id.slice(qIdx + 1).split("=")
        return {routeName, routeQueryName, routeQueryValue}
    }
    return {routeName: selected.id, routeQueryName: null, routeQueryValue: null}
}

/**
 * 检测selected param结果是否能与route参数正确匹配。
 * @param param 由analyseRouteParamFromSelected生成的结果
 * @param routeName route.nane
 * @param routeQuery route.query
 */
function matchSelectedWithRoute(param: {routeName: string, routeQueryName: null, routeQueryValue: null} | {routeName: string, routeQueryName: string, routeQueryValue: string}, routeName: RouteRecordName | null | undefined, routeQuery: LocationQuery): boolean {
    if(param.routeName === routeName) {
        if(param.routeQueryName !== null) {
            if(routeQuery[param.routeQueryName] === param.routeQueryValue) {
                return true
            }
        }else{
            return true
        }
    }
    return false
}
