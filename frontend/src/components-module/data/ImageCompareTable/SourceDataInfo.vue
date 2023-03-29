<script setup lang="ts">
import { SourceInfo } from "@/components-business/form-display"
import { ImageSourceData } from "@/functions/http-client/api/illust"

defineProps<{
    values: (ImageSourceData | null)[]
}>()

</script>

<template>
    <tr v-if="values.some(i => i?.sourceSite)">
        <td>来源</td>
        <td v-for="value in values">
            <SourceInfo v-if="value !== null" :site="value.sourceSite" :source-id="value.sourceId" :source-part="value.sourcePart"/>
        </td>
    </tr>
</template>
