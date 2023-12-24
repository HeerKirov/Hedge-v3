<script setup lang="ts">
import { toRef } from "vue"
import { Button } from "@/components/universal"
import { useMouseHover } from "@/utils/sensors"
import { useImagePosition } from "./image"

const props = defineProps<{
    src: string
    arrowEnabled: boolean
    zoomValue: number
}>()

defineEmits<{
    (e: "arrow", direction: "left" | "right"): void
}>()

const { viewRef, containerRef, containerStyle, imageLoadedEvent } = useImagePosition(toRef(props, "zoomValue"))

const arrowLeftHover = props.arrowEnabled ? useMouseHover() : {hover: undefined, onMouseover: undefined, onMouseleave: undefined}

const arrowRightHover = props.arrowEnabled ? useMouseHover() : {hover: undefined, onMouseover: undefined, onMouseleave: undefined}

</script>

<template>
    <div ref="viewRef" :class="$style.view">
        <div ref="containerRef" :style="containerStyle">
            <img :class="$style.img" :src="src" alt="detail image" @load="imageLoadedEvent"/>
        </div>
        <div v-if="arrowEnabled" :class="$style['arrow-left']" @mouseover="arrowLeftHover.onMouseover" @mouseleave="arrowLeftHover.onMouseleave">
            <Button v-if="arrowLeftHover?.hover?.value" square icon="angle-left" @click="$emit('arrow', 'left')"/>
        </div>
        <div v-if="arrowEnabled" :class="$style['arrow-right']" @mouseover="arrowRightHover.onMouseover" @mouseleave="arrowRightHover.onMouseleave">
            <Button v-if="arrowRightHover?.hover?.value" square icon="angle-right" @click="$emit('arrow', 'right')"/>
        </div>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/size"
.view
    position: relative
    width: 100%
    height: 100%
    overflow: auto
    
    .img
        width: 100%
        height: 100%

    .arrow-left
        position: absolute
        left: 0
        top: 0
        bottom: 0
        width: calc(#{$element-height-large} + #{$spacing-4 * 2})
        > button
            position: absolute
            left: $spacing-4
            top: $spacing-4
            bottom: $spacing-4
            width: $element-height-large
            height: auto
    
    .arrow-right
        position: absolute
        right: 0
        top: 0
        bottom: 0
        width: calc(#{$element-height-large} + #{$spacing-4 * 2})
        > button
            position: absolute
            right: $spacing-4
            top: $spacing-4
            bottom: $spacing-4
            width: $element-height-large
            height: auto
</style>
