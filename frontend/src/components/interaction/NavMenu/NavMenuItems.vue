<script setup lang="ts" generic="T">
import { computed } from "vue"
import { MenuBadge } from "@/components/interaction"
import NavMenuItem from "./NavMenuItem.vue"

const props = defineProps<{
    routeName: string
    icon?: string
    items?: T[] | null | undefined
    generator: (item: T) => {key: string | number, label: string, routePath?: unknown, badge?: MenuBadge}
}>()

const items = computed(() => props.items?.map(props.generator) ?? [])

</script>

<template>
    <NavMenuItem v-for="item in items" :key="item.key" :label="item.label" :route-name="routeName" :route-path="item.routePath" :icon="icon" :badge="item.badge"/>
</template>
