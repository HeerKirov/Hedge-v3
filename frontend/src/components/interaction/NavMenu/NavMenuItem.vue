<script setup lang="ts">
import { computed, onBeforeMount, onUnmounted, watch } from "vue"
import { ContextMenuDefinition, MenuBadge, MenuItem } from "@/components/interaction"
import { mapAnyPathToString } from "@/utils/router"
import { NavContextMenuDefinition, useNavMenuContext } from "./context"

const props = defineProps<{
    routeName: string
    routePath?: unknown
    label: string
    icon?: string
    badge?: MenuBadge
    contextMenu?: NavContextMenuDefinition
    disabled?: boolean
}>()

const { mapping } = useNavMenuContext()

const id = computed(() => props.routePath !== undefined ? `${props.routeName}/${mapAnyPathToString(props.routePath)}` : props.routeName)

onBeforeMount(() => {
    mapping[id.value] = {routeName: props.routeName, routePath: props.routePath}
    watch(id, (newVal, oldVal) => {
        delete mapping[oldVal]
        mapping[newVal] = {routeName: props.routeName, routePath: props.routePath}
    })
})

onUnmounted(() => {
    delete mapping[id.value]
})

const contextMenu: ContextMenuDefinition = () => props.contextMenu?.({routeName: props.routeName, routePath: props.routePath, label: props.label})

</script>

<template>
    <MenuItem :id :label :icon :badge :disabled :contextMenu><slot/></MenuItem>
</template>
