<script setup lang="ts">
import { GridImages } from "@/components/universal"
import { SimpleIllust } from "@/functions/http-client/api/illust"

defineProps<{
    value: SimpleIllust[]
}>()

</script>

<template>
    <GridImages v-if="value.length > 0" :images="value.map(i => i.filePath.sample)" :aspect="2"/>
    <i v-else class="has-text-secondary">没有示例</i>
</template>
