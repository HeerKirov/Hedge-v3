<script setup lang="ts">
import { toRef } from "vue"
import { useImagePosition } from "./image"

const props = defineProps<{
    src: string
    zoomValue: number
}>()

const { viewRef, containerRef, containerStyle, imageLoadedEvent } = useImagePosition(toRef(props, "zoomValue"))

</script>

<template>
    <div ref="viewRef" :class="$style.view">
        <div ref="containerRef" :style="containerStyle">
            <img :class="$style.img" :src="src" alt="detail image" @load="imageLoadedEvent"/>
        </div>
    </div>
</template>

<style module lang="sass">
.view
    width: 100%
    height: 100%
    overflow: auto
    .img
        width: 100%
        height: 100%
        //opacity: 0.05
</style>
