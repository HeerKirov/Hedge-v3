<script setup lang="ts">
import { computed, useCssModule } from "vue"
import { Icon } from "@/components/universal"
import { Colors } from "@/constants/ui"

const props = defineProps<{
    icon?: string
    iconSpin?: boolean
    endIcon?: string
    mode?: "transparent" | "light" | "filled"
    type?: Colors
    size?: "std" | "tiny" | "small" | "large"
    square?: boolean
    round?: boolean
    disabled?: boolean
}>()

const style = useCssModule()

const buttonClass = computed(() => [
    style.button,
    style[`is-size-${props.size ?? "std"}`],
    style[`color-mode-${props.type && props.mode ? props.mode : "transparent"}`],
    props.type ? style[`is-color-${props.type}`] : null,
    props.square ? style.square : null,
    props.round ? style.round : null
])

</script>

<template>
    <button :class="buttonClass" :disabled="disabled">
        <Icon v-if="icon" :class="$style.icon" :icon="icon" :spin="iconSpin"/>
        <slot/>
        <Icon v-if="endIcon" :class="$style['end-icon']" :icon="endIcon"/>
    </button>
</template>

<style module lang="sass">
@use "sass:math"
@use "sass:color" as sass-color
@use "@/styles/base/size"
@use "@/styles/base/color"

.button
    position: relative
    box-sizing: border-box
    vertical-align: middle
    border-radius: size.$radius-size-std
    padding: 0 1em
    &.square
        padding: 0 0
    &:not(.square) > .icon
        transform: translateX(#{- size.$spacing-1})
    &.round
        border-radius: size.$radius-size-round
    .end-icon
        position: absolute
        right: calc(math.div(size.$element-height-small, 2) - 0.5rem)
        top: calc(math.div(size.$element-height-small, 2) - 0.5rem + 1px)

.is-size-tiny
    font-size: size.$font-size-tiny
    height: size.$element-height-tiny
    line-height: size.$element-height-tiny
    &.square
        width: size.$element-height-tiny
.is-size-small
    font-size: size.$font-size-small
    height: size.$element-height-small
    line-height: size.$element-height-small
    &.square
        width: size.$element-height-small
.is-size-std
    font-size: size.$font-size-std
    height: size.$element-height-std
    line-height: size.$element-height-std
    &.square
        width: size.$element-height-std
.is-size-large
    font-size: size.$font-size-large
    height: size.$element-height-large
    line-height: size.$element-height-large
    &.square
        width: size.$element-height-large

@media (prefers-color-scheme: light)
    .color-mode-transparent
        background-color: rgba(#ffffff, 0)
        &:hover:not([disabled])
            background-color: rgba(45, 50, 55, 0.09)
        &:active:not([disabled])
            background-color: rgba(45, 50, 55, 0.13)
        &[disabled]
            color: color.$light-mode-secondary-text-color
        @each $name, $color in color.$light-mode-colors
            &.is-color-#{$name}:not([disabled])
                color: $color
    .color-mode-light
        @each $name, $color in color.$light-mode-colors
            &.is-color-#{$name}
                color: $color
                background-color: rgba($color, 0.15)
                &:hover:not([disabled])
                    background-color: rgba($color, 0.2)
                &:active:not([disabled])
                    background-color: rgba($color, 0.28)
                &[disabled]
                    color: color.$light-mode-secondary-text-color
    .color-mode-filled
        @each $name, $color in color.$light-mode-colors
            &.is-color-#{$name}
                color: color.$light-mode-text-inverted-color
                background-color: $color
                &:hover:not([disabled])
                    background-color: rgba($color, 0.88)
                &:active:not([disabled])
                    background-color: rgba($color, 0.8)
                &[disabled]
                    background-color: sass-color.mix($color, #FFFFFF)
@media (prefers-color-scheme: dark)
    .color-mode-transparent
        background-color: rgba(#000000, 0)
        &:hover:not([disabled])
            background-color: rgba(255, 255, 255, 0.09)
        &:active:not([disabled])
            background-color: rgba(255, 255, 255, 0.13)
        &[disabled]
            color: color.$dark-mode-secondary-text-color
        @each $name, $color in color.$dark-mode-colors
            &.is-color-#{$name}:not([disabled])
                color: $color
    .color-mode-light
        @each $name, $color in color.$dark-mode-colors
            &.is-color-#{$name}
                color: $color
                background-color: rgba($color, 0.15)
                &:hover:not([disabled])
                    background-color: rgba($color, 0.2)
                &:active:not([disabled])
                    background-color: rgba($color, 0.28)
                &[disabled]
                    color: color.$dark-mode-secondary-text-color
    .color-mode-filled
        @each $name, $color in color.$dark-mode-colors
            &.is-color-#{$name}
                color: color.$dark-mode-text-inverted-color
                background-color: $color
                &:hover:not([disabled])
                    background-color: rgba($color, 0.88)
                &:active:not([disabled])
                    background-color: rgba($color, 0.8)
                &[disabled]
                    background-color: sass-color.mix($color, #000000)
</style>
