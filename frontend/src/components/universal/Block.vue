<script setup lang="ts">
import { computed, useCssModule } from "vue"
import { Colors } from "@/constants/ui"

const props = defineProps<{
    color?: Colors
    mode?: "std" | "transparent" | "light" | "filled" | "shadow"
    overflow?: "hidden" | "auto" | "default"
}>()

const style = useCssModule()

const divClass = computed(() => ([
    style.block,
    props.color ? style[`is-color-${props.color}`] : null,
    props.overflow && props.overflow !== "default" ? style[`is-overflow-${props.overflow}`] : null,
    style[`color-mode-${props.mode ?? "std"}`]
]))

</script>

<template>
    <div :class="divClass">
        <slot/>
    </div>
</template>

<style module lang="sass">
@use "sass:color" as sass-color
@use "@/styles/base/color"
@use "@/styles/base/size"

.block
    border-radius: size.$radius-size-std
    position: relative
    box-sizing: border-box

.is-overflow-hidden
    overflow: hidden
.is-overflow-auto
    overflow: auto
    
@media (prefers-color-scheme: light)
    .color-mode-std
        background-color: color.$light-mode-block-color
    .color-mode-std,
    .color-mode-transparent
        border: solid 1px color.$light-mode-border-color
        color: color.$light-mode-text-color
        @each $name, $color in color.$light-mode-colors
            &.is-color-#{$name}
                border-color: $color
    .color-mode-light
        @each $name, $color in color.$light-mode-colors
            &.is-color-#{$name}
                border: solid 1px $color
                color: $color
                background-color: rgba($color, 0.15)
    .color-mode-filled
        @each $name, $color in color.$light-mode-colors
            &.is-color-#{$name}
                color: color.$light-mode-text-inverted-color
                background-color: $color
    .color-mode-shadow
        color: color.$light-mode-text-color
        background-color: color.$light-mode-block-color
        box-shadow: 0 0.25rem 0.5rem 0 rgba(59,63,73,.15)
        @each $name, $color in color.$light-mode-colors
            &.is-color-#{$name}
                color: color.$light-mode-text-inverted-color
                background: linear-gradient(to right, sass-color.mix($color, #ffffff, 80%), $color)
@media (prefers-color-scheme: dark)
    .color-mode-std
        background-color: color.$dark-mode-block-color
    .color-mode-std,
    .color-mode-transparent
        border: solid 1px color.$dark-mode-border-color
        color: color.$dark-mode-text-color
        @each $name, $color in color.$dark-mode-colors
            &.is-color-#{$name}
                border-color: $color
    .color-mode-light
        @each $name, $color in color.$dark-mode-colors
            &.is-color-#{$name}
                border: solid 1px $color
                color: $color
                background-color: rgba($color, 0.15)
    .color-mode-filled
        @each $name, $color in color.$dark-mode-colors
            &.is-color-#{$name}
                color: color.$dark-mode-text-inverted-color
                background-color: $color
    .color-mode-shadow
        color: color.$dark-mode-text-color
        background-color: color.$dark-mode-block-color
        box-shadow: 0 0.25rem 0.5rem 0 rgba(59,63,73,.45)
        @each $name, $color in color.$dark-mode-colors
            &.is-color-#{$name}
                color: color.$dark-mode-text-inverted-color
                background: linear-gradient(to right, $color, sass-color.mix($color, #000000, 75%))
</style>
