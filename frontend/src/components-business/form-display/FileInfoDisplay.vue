<script setup lang="ts">
import { Icon } from "@/components/universal"
import { numbers } from "@/utils/primitives"

defineProps<{
    extension: string
    fileSize: number
    resolutionWidth: number
    resolutionHeight: number
}>()

const EXTENSIONS: Record<string, {name: string, icon: string}> = {
    "jpg": {name: "JPEG图像", icon: "image"},
    "jpeg": {name: "JPEG图像", icon: "image"},
    "png": {name: "PNG图像", icon: "image"},
    "gif": {name: "GIF动态图像", icon: "image"},
    "mp4": {name: "MP4视频", icon: "video"},
    "webm": {name: "WEBM视频", icon: "video"},
    "ogv": {name: "OGV视频", icon: "video"}
}

</script>

<template>
    <div>
        <p>
            <Icon class="mr-1" :icon="EXTENSIONS[extension]?.icon ?? 'question'"/>
            {{EXTENSIONS[extension]?.name ?? `未知类型${extension.toUpperCase()}`}}
        </p>
        <p class="mt-1">
            <Icon class="mr-1" icon="bullseye"/>
            {{resolutionWidth}} x {{resolutionHeight}}
            <span class="has-text-secondary">({{numbers.toBytesDisplay(fileSize)}})</span>
        </p>
    </div>
</template>

<style module lang="sass">

</style>
