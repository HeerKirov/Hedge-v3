<script setup lang="ts">
import { Illust } from "@/functions/http-client/api/illust"
import { Slice } from "@/functions/fetch"
import { SliceOrIndex } from "@/components-module/view-stack"

const props = defineProps<{
    data: SliceOrIndex<Illust, Slice<Illust>, number[]>
    indexModified?: (modifiedIndex: number) => void
}>()

</script>

<template>

</template>

<style module lang="sass">

</style>
