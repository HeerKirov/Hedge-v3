<script setup lang="ts">
import { computed, onBeforeMount, onUnmounted, watch } from "vue"
import { MenuBadge, MenuItem } from "@/components/interaction"
import { mapAnyPathToString } from "@/utils/router"
import { useNavMenuContext } from "./context"

const props = defineProps<{
    routeName: string
    routePath?: unknown
    label: string
    icon?: string
    badge?: MenuBadge
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

</script>

<template>
    <MenuItem :id :label :icon :badge :disabled><slot/></MenuItem>
</template>
