<script setup lang="ts" generic="T">
import { computed, ref, ComponentPublicInstance } from "vue"
import { VirtualGridView } from "@/components/data"
import { useElementRect } from "@/utils/sensors"
import { computedWatch, computedEffect } from "@/utils/reactivity"
import { useDatasetContext } from "./context"
import DatasetGridItem from "./DatasetGridItem.vue"

const props = defineProps<{
    keyOf: (item: T) => number,
    columnNum: number
}>()

defineSlots<{
    default(props: {item: T, index: number, selected: boolean, thumbType: "thumbnail" | "sample"}): any
}>()

const { data, state, updateState, keyOf, summaryDropEvents } = useDatasetContext()

const style = computed(() => ({
    "--var-column-num": props.columnNum
}))

const viewRef = ref<ComponentPublicInstance>()

const viewElement = computed(() => viewRef.value?.$el)

const viewRect = useElementRect(viewElement, {immediate: true})

const viewWidth = computedWatch(viewRect, viewRect => viewRect ? Math.floor(viewRect.width / 10) * 10 : undefined)

const thumbType = computedEffect(() => viewWidth.value !== undefined ? (viewWidth.value / props.columnNum >= 150 ? "thumbnail" : "sample") : "sample")

</script>

<template>
    <VirtualGridView ref="viewRef" class="w-100 h-100" :style="style" v-bind="summaryDropEvents" :state="state" :metrics="data.metrics" @update:state="updateState"
                     :column-count="columnNum" :padding="{top: 1, bottom: 1, left: 2, right: 2}">
        <DatasetGridItem v-for="(item, idx) in data.items" :key="keyOf(item)" :item="item" :index="data.metrics.offset + idx" v-slot="{ selected }">
            <slot :item="item as T" :index="data.metrics.offset + idx" :selected="selected" :thumbType="thumbType"/>
        </DatasetGridItem>
    </VirtualGridView>
</template>
