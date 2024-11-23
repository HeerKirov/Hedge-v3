<script setup lang="ts">
import { Menu } from "@/components/interaction"
import { useActivateTabRoute, useBrowserTabs } from "@/modules/browser"
import { MenuItem } from "@/modules/popup-menu"
import { mapAnyPathToString } from "@/utils/router"
import { computedWatch } from "@/utils/reactivity"
import { installNavMenuContext, ContextMenuDefinition } from "./context"

const browserTabs = useBrowserTabs()
const router = useActivateTabRoute()

const { mapping } = installNavMenuContext()

const menuSelected = computedWatch(router.route, route => {
    const { routeName, path: routePath } = route
    return routePath !== undefined ? `${routeName}/${mapAnyPathToString(routePath)}` : routeName
})

const updateMenuSelected = (selected: string) => {
    const r = mapping[selected]
    if(!r) throw new Error(`Cannot find mapping route info of selected menu item '${selected}'.`)
    router.routePush({routeName: r.routeName, path: r.routePath})
}

const openInNewTab = (id: string) => {
    const r = mapping[id]
    if(!r) throw new Error(`Cannot find mapping route info of selected menu item '${id}'.`)
    browserTabs.newTab({routeName: r.routeName, path: r.routePath})
}

const openInNewWindow = (id: string) => {
    const r = mapping[id]
    if(!r) throw new Error(`Cannot find mapping route info of selected menu item '${id}'.`)
    browserTabs.newWindow({routeName: r.routeName, path: r.routePath})
}

const commonContextMenu: ContextMenuDefinition = ctx => <MenuItem<undefined>[]>[
    {type: "normal", label: "在新标签页中打开", click: () => openInNewTab(ctx.id)},
    {type: "normal", label: "在新窗口中打开", click: () => openInNewWindow(ctx.id)},
]

</script>

<template>
    <Menu :selected="menuSelected" @update:selected="updateMenuSelected" :context-menu="commonContextMenu">
        <slot/>
    </Menu>
</template>
