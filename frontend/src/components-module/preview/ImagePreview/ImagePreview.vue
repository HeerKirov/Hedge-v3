<script setup lang="ts">
import { PlayBoard } from "@/components/data"
import { useAssets } from "@/functions/app"
import { ImageProps, useImagePreviewContext } from "./context"

const props = defineProps<{
    context: ImageProps
}>()

const { assetsUrl } = useAssets()

const { targetFile } = useImagePreviewContext(props.context)

</script>

<template>
    <PlayBoard :src="assetsUrl(targetFile)"/>
</template>

<style module lang="sass">

</style>