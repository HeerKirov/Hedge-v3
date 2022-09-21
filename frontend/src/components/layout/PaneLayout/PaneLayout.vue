<script setup lang="ts">
import { computed, CSSProperties, ref } from "vue"
import { useResizeBar } from "@/utils/sensors"

const props = defineProps<{
    showPane?: boolean
}>()

const DEFAULT_WIDTH = 250
const MAX_WIDTH = 450
const MIN_WIDTH = 200
const ATTACH_RANGE = 10

const width = ref(DEFAULT_WIDTH)

const areaRef = ref<HTMLElement>()

const { resizeAreaMouseDown } = useResizeBar({
    areaRef,
    width,
    location: "left",
    defaultWidth: DEFAULT_WIDTH,
    maxWidth: MAX_WIDTH,
    minWidth: MIN_WIDTH,
    attachRange: ATTACH_RANGE
})

const contentStyle = computed<CSSProperties>(() => ({
    "right": `${props.showPane ? width.value : 0}px`
}))

const paneStyle = computed<CSSProperties>(() => ({
    "width": `${width.value}px`
}))

</script>

<template>
    <div ref="areaRef" :class="$style['pane-layout']">
        <div :class="$style['content']" :style="contentStyle">
            <slot/>
        </div>
        <div v-if="showPane" :class="$style['pane']" :style="paneStyle">
            <slot name="pane"/>
        </div>
        <div v-if="showPane" :class="$style['resize-area']" :style="contentStyle" @mousedown="resizeAreaMouseDown"/>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/color"

.pane-layout
    > .pane
        position: absolute
        top: 0
        bottom: 0
        right: 0
        background-color: $light-mode-background-color
        @media (prefers-color-scheme: dark)
            background-color: $dark-mode-background-color

    > .content
        position: absolute
        top: 0
        bottom: 0
        left: 0
        min-width: 24rem

    > .resize-area
        position: absolute
        top: 0
        bottom: 0
        width: 5px
        transform: translateX(3px)
        cursor: ew-resize
</style>
