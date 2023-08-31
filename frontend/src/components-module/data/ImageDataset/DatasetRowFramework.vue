<script setup lang="ts" generic="T">
import { computed } from "vue"
import { VirtualRowView } from "@/components/data"
import { useDatasetContext } from "./context"
import DatasetRowItem from "./DatasetRowItem.vue"

const props = defineProps<{
    keyOf: (item: T) => number,
    rowHeight: number
}>()

defineSlots<{
    default(props: {item: T, index: number, selected: boolean}): any
}>()

const { data, dataUpdate, keyOf, summaryDropEvents } = useDatasetContext()

const style = computed(() => ({
    "--var-row-height": `${props.rowHeight}px`
}))

</script>

<template>
    <VirtualRowView class="w-100 h-100" :style="style" v-bind="{...data.metrics, ...summaryDropEvents}" @update="dataUpdate"
                     :row-height="rowHeight" :buffer-size="6" :min-update-delta="3">
        <DatasetRowItem v-for="(item, idx) in data.result" :key="keyOf(item)" :item="item" :index="data.metrics.offset + idx" v-slot="{ selected }">
            <slot :item="item as T" :index="data.metrics.offset + idx" :selected="selected"/>
        </DatasetRowItem>
    </VirtualRowView>
</template>
