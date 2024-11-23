<script setup lang="ts">
import { useRouter } from "vue-router"
import { Menu } from "@/components/interaction"
import { mapAnyPathToString } from "@/utils/router"
import { computedWatch } from "@/utils/reactivity"
import { installNavMenuContext } from "./context"

const router = useRouter()

const { mapping } = installNavMenuContext()

const menuSelected = computedWatch(router.currentRoute, route => {
    const { name, params } = route
    const routeName = name as string
    const routePath = params[Object.keys(params)[0]] as string | undefined
    return routePath !== undefined ? `${routeName}/${mapAnyPathToString(routePath)}` : routeName
})

const updateMenuSelected = (selected: string) => {
    const r = mapping[selected]
    if(!r) throw new Error(`Cannot find mapping route info of selected menu item '${selected}'.`)
    router.push({name: r.routeName, params: r.routePath !== undefined ? {"detail": r.routePath as any} : undefined})
}

</script>

<template>
    <Menu :selected="menuSelected" @update:selected="updateMenuSelected">
        <slot/>
    </Menu>
</template>
