<script setup lang="ts">
import { Button } from "@/components/universal"

const props = withDefaults(defineProps<{
    showCloseButton?: boolean
    overflow?: boolean
}>(), {
    showCloseButton: true,
    overflow: true
})

const emit = defineEmits<{
    (e: "close"): void
}>()

</script>

<template>
    <div :class="$style['base-pane']">
        <Button v-if="showCloseButton" :class="$style['button']" icon="close" square @click="$emit('close')"/>
        <div v-if="!!$slots.title" :class="$style['top-content']">
            <slot name="title"/>
        </div>
        <div :class="[!$slots.title && !showCloseButton ? $style['full-content'] : $style['content'], {[$style['overflow']]: overflow}]">
            <slot/>
        </div>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/color"
@import "../../../styles/base/size"

.base-pane
    position: relative
    height: 100%
    background-color: $light-mode-block-color
    border-left: solid 1px $light-mode-border-color
    @media (prefers-color-scheme: dark)
        background-color: $dark-mode-block-color
        border-left-color: $dark-mode-border-color

    > .button
        position: absolute
        top: $spacing-1
        right: $spacing-1

    > .top-content
        position: absolute
        top: $spacing-1
        left: $spacing-1
        right: calc(#{$spacing-1 * 2} + #{$element-height-std})
        height: $element-height-std

    > .content
        position: absolute
        top: calc(#{$spacing-1 * 2} + #{$element-height-std})
        left: 0
        right: 0
        bottom: 0
        box-sizing: border-box
        padding-left: $spacing-3
        padding-right: $spacing-3
        &.overflow
            overflow-y: auto

    > .full-content
        box-sizing: border-box
        height: 100%
        padding-top: $spacing-1
        padding-left: $spacing-3
        padding-right: $spacing-3
        &.overflow
            overflow-y: auto

</style>
