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
@import "../../styles/base/color"
@import "../../styles/base/size"

.block
    border-radius: $radius-size-std
    position: relative
    box-sizing: border-box

.is-overflow-hidden
    overflow: hidden
.is-overflow-auto
    overflow: auto
    
@media (prefers-color-scheme: light)
    .color-mode-std
        background-color: $light-mode-block-color
    .color-mode-std,
    .color-mode-transparent
        border: solid 1px $light-mode-border-color
        color: $light-mode-text-color
        @each $name, $color in $light-mode-colors
            &.is-color-#{$name}
                border-color: $color
    .color-mode-light
        @each $name, $color in $light-mode-colors
            &.is-color-#{$name}
                border: solid 1px $color
                color: $color
                background-color: rgba($color, 0.15)
    .color-mode-filled
        @each $name, $color in $light-mode-colors
            &.is-color-#{$name}
                color: $light-mode-text-inverted-color
                background-color: $color
    .color-mode-shadow
        color: $light-mode-text-color
        box-shadow: 0 0.25rem 0.5rem 0 rgba(59,63,73,.15)
        @each $name, $color in $light-mode-colors
            &.is-color-#{$name}
                color: $light-mode-text-inverted-color
                background: linear-gradient(to right, mix($color, #ffffff, 80), $color)
@media (prefers-color-scheme: dark)
    .color-mode-std
        background-color: $dark-mode-block-color
    .color-mode-std,
    .color-mode-transparent
        border: solid 1px $dark-mode-border-color
        color: $dark-mode-text-color
        @each $name, $color in $dark-mode-colors
            &.is-color-#{$name}
                border-color: $color
    .color-mode-light
        @each $name, $color in $dark-mode-colors
            &.is-color-#{$name}
                border: solid 1px $color
                color: $color
                background-color: rgba($color, 0.15)
    .color-mode-filled
        @each $name, $color in $dark-mode-colors
            &.is-color-#{$name}
                color: $dark-mode-text-inverted-color
                background-color: $color
    .color-mode-shadow
        color: $dark-mode-text-color
        box-shadow: 0 0.25rem 0.5rem 0 rgba(59,63,73,.45)
        @each $name, $color in $dark-mode-colors
            &.is-color-#{$name}
                color: $dark-mode-text-inverted-color
                background: linear-gradient(to right, $color, mix($color, #000000, 75))
</style>
