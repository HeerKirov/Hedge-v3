<script setup lang="ts">
import { SourceInfo } from "@/components-business/form-display"
import { ImageData } from "./context"

defineProps<{
    values: (ImageData["sourceData"] | null)[]
}>()

</script>

<template>
    <tr v-if="values.some(i => i?.site)">
        <td>来源</td>
        <td v-for="value in values">
            <SourceInfo v-if="value !== null" :site="value.site" :source-id="value.sourceId" :source-part="value.sourcePart"/>
        </td>
    </tr>
</template>
