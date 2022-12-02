<script setup lang="ts">
import { computed } from "vue"
import { VirtualGridView } from "@/components/data"
import { useDatasetContext } from "./context"
import DatasetGridItem from "./DatasetGridItem.vue"

const props = defineProps<{
    columnNum: number
}>()

const { data, dataUpdate, keyOf, summaryDropEvents } = useDatasetContext()

const style = computed(() => ({
    "--var-column-num": props.columnNum
}))

</script>

<template>
    <VirtualGridView class="w-100 h-100" :style="style" v-bind="{...data.metrics, ...summaryDropEvents}" @update="dataUpdate"
                     :column-count="columnNum" :buffer-size="5" :min-update-delta="1"
                     :padding="{top: 1, bottom: 1, left: 2, right: 2}">
        <DatasetGridItem v-for="(item, idx) in data.result" :key="keyOf(item)" :item="item" :index="data.metrics.offset + idx" v-slot="{ selected }">
            <slot :item="item" :index="data.metrics.offset + idx" :selected="selected"/>
        </DatasetGridItem>
    </VirtualGridView>
</template>
