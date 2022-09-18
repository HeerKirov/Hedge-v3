import { computed, Ref } from "vue"
import { GeneratedNavMenuItem, NavItemSetup, NavSubMenuItem } from "./side-nav-menu"
import { NavHistory } from "./side-nav-history"


export function setupSubItemByNavHistory(navHistory: NavHistory, routeName: string, routeQueryName: string): NavItemSetup<NavSubMenuItem> {
    function mapNavHistoryToMenuItem(i: {id: string, label: string}): NavSubMenuItem {
        return {routeQueryName, routeQueryValue: i.id, label: i.label}
    }

    return function () {
        return computed(() => navHistory.histories[routeName]?.map(mapNavHistoryToMenuItem) ?? [])
    }
}

export function setupItemByNavHistory(navHistory: NavHistory, routeName: string, routeQueryName: string, icon: string): NavItemSetup<GeneratedNavMenuItem> {
    function mapNavHistoryToMenuItem(i: {id: string, label: string}): GeneratedNavMenuItem {
        return {type: "menu", routeName, routeQueryName, routeQueryValue: i.id, label: i.label, icon}
    }

    return function () {
        return computed(() => navHistory.histories[routeName]?.map(mapNavHistoryToMenuItem) ?? [])
    }
}

export function setupItemByRef<T>(refVar: Ref<T[] | null | undefined>, routeName: string, routeQueryName: string, icon: string, refMap: (t: T) => {routeQueryValue: string, label: string}): NavItemSetup<GeneratedNavMenuItem> {
    function mapItemToMenuItem(t: T): GeneratedNavMenuItem {
        const mapped = refMap(t)
        return {type: "menu", routeName, routeQueryName, ...mapped, icon}
    }

    return function () {
        return computed(() => refVar.value?.map(mapItemToMenuItem) ?? [])
    }
}
