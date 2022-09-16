<script setup lang="ts">
import { computed, CSSProperties, ref } from "vue"
import { useSideLayoutState, DEFAULT_WIDTH, ATTACH_RANGE, MAX_WIDTH, MIN_WIDTH } from "./context"
import { useResizeBar } from "@/utils/sensors"

const { width, isOpen } = useSideLayoutState()

const areaRef = ref<HTMLElement>()

const { resizeAreaMouseDown } = useResizeBar({
    areaRef,
    width,
    location: "right",
    defaultWidth: DEFAULT_WIDTH,
    maxWidth: MAX_WIDTH,
    minWidth: MIN_WIDTH,
    attachRange: ATTACH_RANGE
})

const contentStyle = computed<CSSProperties>(() => ({
    "left": `${isOpen.value ? width.value : 0}px`
}))

const sideStyle = computed<CSSProperties>(() => ({
    "width": `${width.value}px`,
    "transform": `translateX(${isOpen.value ? '0' : '-101%'})`,
    "visibility": isOpen.value ? "visible" : "hidden"
}))

</script>

<template>
    <div :class="$style['side-layout']" ref="areaRef">
        <div :class="$style.content" :style="contentStyle">
            <slot/>
        </div>
        <div :class="$style.side" :style="sideStyle">
            <slot name="side"/>
        </div>
        <div v-if="isOpen" :class="$style['resize-area']" :style="contentStyle" @mousedown="resizeAreaMouseDown"/>
    </div>
</template>

<style module lang="sass">
$transaction-time: 0.4s

.side-layout
    position: relative
    width: 100%
    height: 100%
    > .side
        position: absolute
        top: 0
        bottom: 0
        left: 0
        transition: transform $transaction-time ease, visibility $transaction-time
    > .content
        position: absolute
        top: 0
        bottom: 0
        right: 0
        transition: left $transaction-time ease
    > .resize-area
        position: absolute
        top: 0
        bottom: 0
        width: 5px
        transform: translateX(-3px)
        cursor: ew-resize
</style>
