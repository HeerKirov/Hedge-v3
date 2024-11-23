<script setup lang="ts">
import { useNavigationRecords } from "@/services/base/side-nav-records"
import { mapAnyPathToString } from "@/utils/router"
import NavMenuItem from "./NavMenuItem.vue"

const props = defineProps<{
    routeName: string
    icon?: string
}>()

const navigationRecords = useNavigationRecords()

</script>

<template>
    <NavMenuItem v-for="item in navigationRecords.records[routeName]" :key="`${props.routeName}/${mapAnyPathToString(item.path)}`" :label="item.label" :route-name="routeName" :route-path="item.path" :icon="icon" :badge="item.badge"/>
</template>
