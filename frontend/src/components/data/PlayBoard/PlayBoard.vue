<script setup lang="ts">
import { computed, watch } from "vue"
import ImageBoard from "./ImageBoard.vue"
import VideoBoard from "./VideoBoard.vue"

const props = defineProps<{
    src: string
    zoomEnabled?: boolean
    zoomValue?: number
}>()

const emit = defineEmits<{
    (e: "update:zoom-enabled", v: boolean): void
}>()

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif"]
const VIDEO_EXTENSIONS = ["mp4", "webm", "ogv"]

function getDashboardType(src: string): "Image" | "Video" | null {
    const extension = getExtension(src)
    return IMAGE_EXTENSIONS.includes(extension) ? "Image" : VIDEO_EXTENSIONS.includes(extension) ? "Video" : null
}

function getExtension(src: string): string {
    const i = src.lastIndexOf(".")
    if(i >= 0) {
        return src.substring(i + 1).toLowerCase()
    }
    return ""
}

const type = computed(() => getDashboardType(props.src))

watch(type, type => emit("update:zoom-enabled", type === "Image"), {immediate: true})

</script>

<template>
    <ImageBoard v-if="type === 'Image'" :src="src" :zoom-value="zoomValue ?? 100"/>
    <VideoBoard v-else-if="type === 'Video'" :src="src"/>
</template>
