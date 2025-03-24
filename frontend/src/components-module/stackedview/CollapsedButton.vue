<script setup lang="ts">
import { Button } from "@/components/universal"
import { useMouseHover } from "@/utils/sensors"
import BackButton from "@/components-module/stackedview/BackButton.vue";

defineProps<{
    hasWinButton: boolean
    hasDarwinBorder: boolean
}>()

defineEmits<{
    (e: "click:collapsed", value: boolean): void
}>()

const { hover, ...mouseEvents } = useMouseHover()

</script>

<template>
    <div :class="{[$style['hover-area']]: true, [$style['has-darwin-button']]: hasDarwinBorder}" v-bind="mouseEvents">
        <BackButton v-if="hover" :class="$style['back-button']"/>
        <Button v-if="hover" :class="{[$style['collapse-button']]: true, [$style['darwin-border-button']]: hasDarwinBorder, [$style['has-win-button']]: hasWinButton}" square icon="fa-down-left-and-up-right-to-center" @click="$emit('click:collapsed', false)"/>
    </div>
</template>

<style module lang="sass">
@use "sass:math"
@use "@/styles/base/size"

$content-margin-size: math.div(size.$title-bar-height - size.$element-height-std, 2)

.hover-area
    -webkit-app-region: none
    position: fixed
    top: 0
    right: 0
    left: 0
    height: size.$title-bar-height
    padding-top: size.$spacing-1
    padding-right: size.$spacing-1
    //macOS平台的内容区域布局。左侧留出红绿灯的宽度
    &.has-darwin-button
        padding-left: #{$content-margin-size + size.$macos-buttons-width}

.collapse-button
    position: fixed
    top: size.$spacing-1
    right: size.$spacing-1
    &.darwin-border-button
        border-top-right-radius: size.$radius-size-very-large
    &.has-win-button
        right: #{size.$spacing-1 + size.$win-buttons-width}
</style>