<script setup lang="ts">
import { Menu } from "@/components/interaction"
import { useActivateTabRoute } from "@/modules/browser"
import { mapAnyPathToString } from "@/utils/router"
import { computedWatch } from "@/utils/reactivity"
import { installNavMenuContext } from "./context"

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

</script>

<template>
    <Menu :selected="menuSelected" @update:selected="updateMenuSelected">
        <slot/>
    </Menu>
</template>
