<script setup lang="ts">
import { computed } from "vue"
import { ImageCompareTable } from "@/components-module/data"
import { useFindSimilarDetailPanel } from "@/services/main/find-similar"

const { selector: { selected } } = useFindSimilarDetailPanel()

const ids = computed(() => selected.value.length === 2 ? selected.value : selected.value.length > 2 ? selected.value.slice(0, 2) : selected.value.length === 1 ? [selected.value[0], null] : [null, null])

</script>

<template>
    <div class="p-2">
        <ImageCompareTable :column-num="2" :titles="['A', 'B']" :ids="ids"/>
    </div>
</template>