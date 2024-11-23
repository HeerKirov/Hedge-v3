<script setup lang="ts">
import { useNavigationRecords } from "@/services/base/side-nav-records"
import { MenuItem } from "@/modules/popup-menu"
import { mapAnyPathToString } from "@/utils/router"
import { NavContextMenuDefinition } from "./context"
import NavMenuItem from "./NavMenuItem.vue"

const props = defineProps<{
    routeName: string
    icon?: string
    contextMenu?: NavContextMenuDefinition
}>()

const navigationRecords = useNavigationRecords()

const contextMenu: NavContextMenuDefinition = ctx => {
    const contextMenu = props.contextMenu?.(ctx)
    const selfContextMenu = <MenuItem<undefined>[]>[
        {type: "normal", label: "清空最近访问列表", click: () => navigationRecords.clearRecord(props.routeName)},
    ]
    return contextMenu?.length ? [...selfContextMenu, {type: "separator"}, ...contextMenu] : selfContextMenu
}

</script>

<template>
    <NavMenuItem v-for="item in navigationRecords.records[routeName]"
                 :key="`${props.routeName}/${mapAnyPathToString(item.path)}`"
                 :label="item.label" :routeName :route-path="item.path" :icon :badge="item.badge" :contextMenu/>
</template>
