<script setup lang="ts">
import { computed } from "vue"
import { Icon } from "@/components/universal"
import { useTabStorage } from "@/functions/app"
import { usePopupMenu } from "@/modules/popup-menu"
import { isBrowserEnvironment, useBrowserTabs, useTabRoute } from "@/modules/browser"
import { LocalDate, LocalDateTime, datetime } from "@/utils/datetime"

const props = defineProps<{
    partitionTime: LocalDate
    orderTime?: LocalDateTime
    createTime?: LocalDateTime
    updateTime?: LocalDateTime
}>()

const hasBrowser = isBrowserEnvironment()
const browserTabs = hasBrowser ? useBrowserTabs() : undefined
const router = hasBrowser ? useTabRoute() : undefined

const isOpened = useTabStorage<boolean>("partition-time-display/switch", false)

const dateText = computed(() => `${props.partitionTime.year}年${props.partitionTime.month}月${props.partitionTime.day}日`)

const offset = computed(() => props.orderTime !== undefined ? Math.floor((<any>new Date(props.orderTime.timestamp) - <any>new Date(props.partitionTime.timestamp)) / (1000 * 60 * 60 * 24)) : null)

const timeText = computed(() => props.orderTime !== undefined ? datetime.toSimpleFormatOnlyTime(props.orderTime): null)

const orderTimeText = computed(() => props.orderTime !== undefined ? `${props.orderTime.year}年${props.orderTime.month}月${props.orderTime.day}日 ${timeText.value}` : null)

const openPartition = () => router!.routePush({routeName: "Partition", path: props.partitionTime})

const openPartitionInNewTab = () => browserTabs!.newTab({routeName: "Partition", path: props.partitionTime})

const openPartitionInNewWindow = () => browserTabs!.newWindow({routeName: "Partition", path: props.partitionTime})

const collapse = () => {
    if(props.createTime !== undefined || props.updateTime !== undefined || (offset.value && (offset.value > 1 || offset.value < -1))) {
        isOpened.value = !isOpened.value
    }
}

const menu = usePopupMenu(() => [
    {type: "normal", "label": isOpened.value ? "折叠时间属性" : "展开时间属性", click: collapse},
    ...(hasBrowser ? [
        {type: "separator"},
        {type: "normal", "label": "查看时间分区", click: openPartition},
        {type: "normal", "label": "在新标签页中打开时间分区", click: openPartitionInNewTab},
        {type: "normal", "label": "在新窗口中打开时间分区", click: openPartitionInNewWindow}
    ] as const : [])
])

</script>

<template>
    <div :class="$style.root" @contextmenu="menu.popup()">
        <p>
            <Icon class="ml-half" :icon="offset !== null && offset <= 1 && offset >= -1 && !isOpened ? 'business-time' : 'clock'"/>
            <b class="ml-2 mr-1">{{ dateText }}</b>
            <span v-if="offset && offset <= 1 && offset >= -1 && !isOpened" class="has-text-danger mr-1">({{ offset > 0 ? '+' : '-' }}{{ offset > 0 ? offset : -offset }})</span>
            <span v-if="timeText && (!offset || (offset <= 1 && offset >= -1)) && !isOpened">{{ timeText }}</span>
        </p>
        <p v-if="(offset && (offset > 1 || offset < -1)) || isOpened">
            <Icon class="ml-half mr-mhalf" icon="business-time"/>
            <span class="ml-2 mr-1 is-font-size-small">{{ orderTimeText }}</span>
        </p>
        <p v-if="createTime && isOpened">
            <Icon class="ml-half mr-mhalf has-text-secondary" icon="user-clock"/>
            <span class="ml-2 mr-1 is-font-size-small has-text-secondary">创建时间 {{createTime.year}}年{{createTime.month}}月{{createTime.day}}日 {{datetime.toSimpleFormatOnlyTime(createTime)}}</span>
        </p>
        <p v-if="updateTime && (!createTime || updateTime.timestamp !== createTime.timestamp) && isOpened">
            <Icon class="ml-half mr-mhalf has-text-secondary" icon="user-clock"/>
            <span class="ml-2 mr-1 is-font-size-small has-text-secondary">上次修改 {{updateTime.year}}年{{updateTime.month}}月{{updateTime.day}}日 {{datetime.toSimpleFormatOnlyTime(updateTime)}}</span>
        </p>
    </div>
</template>

<style module lang="sass">
.root
    p > *
        vertical-align: middle
</style>

