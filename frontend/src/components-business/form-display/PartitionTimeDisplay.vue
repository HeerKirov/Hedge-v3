<script setup lang="ts">
import { computed } from "vue"
import { usePopupMenu } from "@/modules/popup-menu"
import { useRouterNavigator } from "@/modules/router"
import { date, LocalDate } from "@/utils/datetime"

const props = defineProps<{
    partitionTime: LocalDate
}>()

const navigator = useRouterNavigator()

const text = computed(() => date.toISOString(props.partitionTime))

const openPartition = () => navigator.goto({routeName: "MainPartition", query: {detail: props.partitionTime}})
const openPartitionInNewWindow = () => navigator.newWindow({routeName: "MainPartition", query: {detail: props.partitionTime}})
const menu = usePopupMenu([
    {type: "normal", "label": "查看时间分区", click: openPartition},
    {type: "normal", "label": "在新窗口中打开时间分区", click: openPartitionInNewWindow}
])

</script>

<template>
    <div class="pt-1">
        <p class="secondary-text" @contextmenu="menu.popup()">时间分区 {{text}}</p>
    </div>
</template>

