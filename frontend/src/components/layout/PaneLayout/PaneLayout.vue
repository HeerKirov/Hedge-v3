<script setup lang="ts">
import { computed, CSSProperties, ref } from "vue"
import { useResizeBar } from "@/utils/sensors"

// == Pane Layout 侧边面板布局 ==
// 将布局分为右侧的侧边面板和左侧的主要区域。slot#default为主要区域，slot#pane为侧边面板。
// 通过showPane参数控制侧边面板是否显示。
// 侧边面板可以被拖放改变大小。

const props = defineProps<{
    showPane?: boolean
}>()

const DEFAULT_WIDTH = 250
const MAX_WIDTH = 900
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
        <transition :enter-from-class="$style['transition-enter-from']" :leave-to-class="$style['transition-leave-to']" :enter-active-class="$style['transition-enter-active']" :leave-active-class="$style['transition-leave-active']">
            <div v-if="showPane" :class="$style['pane']" :style="paneStyle">
                <slot name="pane"/>
            </div>
        </transition>
        <div v-if="showPane" :class="$style['resize-area']" :style="contentStyle" @mousedown="resizeAreaMouseDown"/>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/color"

$transaction-time: 0.25s

.pane-layout
    > .pane
        position: absolute
        top: 0
        bottom: 0
        right: 0
        background-color: $light-mode-background-color
        @media (prefers-color-scheme: dark)
            background-color: $dark-mode-background-color

        &.transition-enter-active,
        &.transition-leave-active
            transition: transform $transaction-time ease
        &.transition-enter-from,
        &.transition-leave-to
            transform: translateX(100%)

    > .content
        position: absolute
        top: 0
        bottom: 0
        left: 0
        min-width: 24rem
        transition: right $transaction-time ease

    > .resize-area
        position: absolute
        top: 0
        bottom: 0
        width: 5px
        transform: translateX(3px)
        cursor: ew-resize
</style>
