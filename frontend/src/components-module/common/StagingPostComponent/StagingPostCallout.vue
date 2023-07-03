<script setup lang="ts">
import { computed } from "vue"
import { Block } from "@/components/universal"
import { useCalloutContext } from "./context"
import StagingPostContent from "./StagingPostContent.vue"

defineEmits<{
    (e: "close"): void
}>()

const { calloutSize, areaRef, resizeAreaMouseDown, resizing } = useCalloutContext()

const calloutStyle = computed(() => ({
    "width": `${calloutSize.value.width}px`,
    "height": `${calloutSize.value.height}px`
}))

</script>

<template>
    <Block ref="areaRef" :class="$style.popup" :style="calloutStyle">
        <div v-if="resizing" :class="$style['full-cover']"/><!-- 一个仅在拖曳时出现的遮罩层,可以遮蔽outside click,防止mouseup时关闭组件 -->
        <StagingPostContent @close="$emit('close')"/>
        <div :class="$style['top-drag-area']" @mousedown="resizeAreaMouseDown('top')"/>
        <div :class="$style['right-drag-area']" @mousedown="resizeAreaMouseDown('right')"/>
        <div :class="$style['top-right-drag-area']" @mousedown="resizeAreaMouseDown('top-right')"/>
    </Block>
</template>

<style module lang="sass">
@import "../../../styles/base/size"

.popup
    z-index: 1
    position: fixed
    left: $spacing-1
    bottom: calc(#{$element-height-std} + #{$spacing-3})
    box-shadow: 0 0.25rem 0.5rem 0 rgba(59,63,73,.25)
    
    .top-drag-area
        position: absolute
        top: -2px
        left: 2px
        right: 6px
        height: 4px
        cursor: ns-resize
    .right-drag-area
        position: absolute
        top: 6px
        bottom: 2px
        right: -2px
        width: 4px
        cursor: ew-resize
    .top-right-drag-area
        position: absolute
        top: -2px
        right: -2px
        width: 8px
        height: 8px
        cursor: sw-resize

.full-cover
    position: fixed
    left: 0
    top: 0
    width: 100vw
    height: 100vh
</style>