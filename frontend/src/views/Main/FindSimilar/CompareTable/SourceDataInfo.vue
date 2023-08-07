<script setup lang="ts">
import { SourceInfo } from "@/components-business/form-display"
import { FindSimilarCompareData } from "@/services/main/find-similar"

defineProps<{
    values: FindSimilarCompareData["sourceData"][]
}>()

</script>

<template>
    <tr v-if="values.some(i => i !== null)">
        <td>来源</td>
        <td v-for="value in values">
            <SourceInfo v-if="value !== null" :source="value"/>
        </td>
    </tr>
</template>
