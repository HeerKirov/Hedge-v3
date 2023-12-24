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

const { data, state, updateState, keyOf, summaryDropEvents } = useDatasetContext()

const style = computed(() => ({
    "--var-row-height": `${props.rowHeight}px`
}))

</script>

<template>
    <VirtualRowView class="w-100 h-100" :style="style" v-bind="summaryDropEvents" :state="state" :metrics="data.metrics" @update:state="updateState" :row-height="rowHeight">
        <DatasetRowItem v-for="(item, idx) in data.items" :key="keyOf(item)" :item="item" :index="data.metrics.offset + idx" v-slot="{ selected }">
            <slot :item="item as T" :index="data.metrics.offset + idx" :selected="selected"/>
        </DatasetRowItem>
    </VirtualRowView>
</template>
