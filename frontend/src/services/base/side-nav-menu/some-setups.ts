import { computed, Ref } from "vue"
import { GeneratedNavMenuItem, NavItemSetup, NavSubMenuItem } from "./side-nav-menu"
import { NavigationRecords } from "./side-nav-records"
import { MenuBadge } from "@/components/interaction"
import { mapAnyPathToString } from "@/utils/router";


export function setupSubItemByNavHistory(navHistory: NavigationRecords, routeName: string): NavItemSetup<NavSubMenuItem> {
    function mapNavHistoryToMenuItem(i: {id: string, path: unknown, label: string, badge: MenuBadge}): NavSubMenuItem {
        return {routeName, routePath: {key: i.id, value: i.path}, label: i.label, badge: i.badge}
    }

    return function () {
        return computed(() => navHistory.records[routeName]?.map(mapNavHistoryToMenuItem) ?? [])
    }
}

export function setupItemByNavHistory(navHistory: NavigationRecords, routeName: string, icon: string): NavItemSetup<GeneratedNavMenuItem> {
    function mapNavHistoryToMenuItem(i: {id: string, path: unknown, label: string, badge: MenuBadge}): GeneratedNavMenuItem {
        return {type: "menu", routeName, routePath: {key: i.id, value: i.path}, label: i.label, badge: i.badge, icon}
    }

    return function () {
        return computed(() => navHistory.records[routeName]?.map(mapNavHistoryToMenuItem) ?? [])
    }
}

export function setupItemByRef<T>(refVar: Ref<T[] | null | undefined>, routeName: string, icon: string, refMap: (t: T) => {routePathValue: unknown, label: string}): NavItemSetup<GeneratedNavMenuItem> {
    function mapItemToMenuItem(t: T): GeneratedNavMenuItem {
        const mapped = refMap(t)
        //tips: 这里实际就有side-nav-menu里提到的实现方式造成的问题。
        //      但实际没有，其实是凑巧，因为这里的唯一应用folderId，即使作为string被传入，也能成功作为path参数被使用。
        //      但这种使用方式很可能不知不觉在系统中留下隐性的BUG。
        return {type: "menu", routeName, label: mapped.label, routePath: {key: mapAnyPathToString(mapped.routePathValue), value: mapped.routePathValue}, icon}
    }

    return function () {
        return computed(() => refVar.value?.map(mapItemToMenuItem) ?? [])
    }
}
