<script setup lang="ts">
import { PlayBoard } from "@/components/data"
import { useAssets } from "@/functions/app"
import { ImageProps, useImagePreviewContext } from "./context"

const props = defineProps<{
    context: ImageProps
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const { assetsUrl } = useAssets()

const { targetFile } = useImagePreviewContext(props.context, () => emit("close"))

</script>

<template>
    <PlayBoard :src="assetsUrl(targetFile)"/>
</template>
