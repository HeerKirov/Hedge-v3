<script setup lang="ts">
import { Icon } from "@/components/universal"
import { numbers } from "@/utils/primitives"

defineProps<{
    extension?: string
    fileSize?: number
    resolutionWidth?: number
    resolutionHeight?: number
    mode?: "block" | "inline"
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
    <div v-if="mode !== 'inline'">
        <p v-if="extension !== undefined">
            <Icon class="mr-1" :icon="EXTENSIONS[extension]?.icon ?? 'question'"/>
            {{EXTENSIONS[extension]?.name ?? `未知类型${extension.toUpperCase()}`}}
        </p>
        <p v-if="resolutionWidth !== undefined || resolutionHeight !== undefined || fileSize !== undefined" class="mt-1">
            <template v-if="resolutionWidth !== undefined || resolutionHeight !== undefined">
                <Icon class="mr-1" icon="bullseye"/>
                {{resolutionWidth}} x {{resolutionHeight}}
            </template>
            <span v-if="fileSize !== undefined" class="has-text-secondary">({{numbers.toBytesDisplay(fileSize)}})</span>
        </p>
    </div>
    <span v-else>
        <span v-if="extension !== undefined" class="no-wrap">
            <Icon :icon="EXTENSIONS[extension]?.icon ?? 'question'"/>
            {{EXTENSIONS[extension]?.name ?? `未知类型${extension.toUpperCase()}`}}
        </span>
        <span v-if="resolutionWidth !== undefined || resolutionHeight !== undefined || fileSize !== undefined" class="ml-2 no-wrap">
            <template v-if="resolutionWidth !== undefined || resolutionHeight !== undefined">
                <Icon class="mr-1" icon="bullseye"/>
                {{resolutionWidth}} x {{resolutionHeight}}
            </template>
            <span v-if="fileSize !== undefined" class="has-text-secondary">({{numbers.toBytesDisplay(fileSize)}})</span>
        </span>
    </span>
</template>

<style module lang="sass">

</style>
