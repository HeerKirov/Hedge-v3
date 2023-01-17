<script setup lang="ts">
import { toRefs } from "vue"
import { ThumbnailImage } from "@/components/universal"
import { useImportDetailPaneMultiple } from "./context"

const props = defineProps<{
    selected: number[]
    latest: number
}>()

const { selected, latest } = toRefs(props)

const { data } = useImportDetailPaneMultiple(selected, latest)

</script>

<template>
    <ThumbnailImage minHeight="12rem" maxHeight="40rem" :file="data?.thumbnailFile"/>
    multiple
</template>

<style module lang="sass">

</style>
