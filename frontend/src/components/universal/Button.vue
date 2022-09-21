<script setup lang="ts">
import { computed, Ref, ref, useCssModule } from "vue"
import { Icon } from "@/components/universal"
import { ThemeColors } from "@/constants/ui"

const props = defineProps<{
    icon?: string
    mode?: "transparent" | "light" | "filled"
    type?: ThemeColors
    size?: "std" | "small" | "large"
    square?: boolean
    round?: boolean
    disabled?: boolean
    exposeEl?: boolean
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

let el: Ref<HTMLElement | undefined> | undefined = undefined
let setEl: ((element: HTMLElement | undefined) => void) | undefined = undefined
if(props.exposeEl) {
    el = ref<HTMLElement>()
    setEl = element => el!.value = element
}

defineExpose({
    el
})

</script>

<template>
    <button :ref="exposeEl ? setEl : undefined" :class="buttonClass" :disabled="disabled">
        <Icon v-if="icon" :class="$style.icon" :icon="icon"/>
        <slot/>
    </button>
</template>

<style module lang="sass">
@import "../../styles/base/size"
@import "../../styles/base/color"

.button
    box-sizing: border-box
    vertical-align: baseline
    border-radius: $radius-size-std
    padding: 0 1em
    &.square
        padding: 0 0
    &:not(.square) > .icon
        transform: translateX(#{-$spacing-1})
    &.round
        border-radius: $radius-size-round

.is-size-small
    font-size: $font-size-small
    height: $element-height-small
    &.square
        width: $element-height-small
.is-size-std
    font-size: $font-size-std
    height: $element-height-std
    &.square
        width: $element-height-std
.is-size-large
    font-size: $font-size-large
    height: $element-height-large
    &.square
        width: $element-height-large

@media (prefers-color-scheme: light)
    .color-mode-transparent
        background-color: rgba(#ffffff, 0)
        color: $light-mode-text-color
        &:hover:not([disabled])
            background-color: rgba(45, 50, 55, 0.09)
        &:active:not([disabled])
            background-color: rgba(45, 50, 55, 0.13)
        &[disabled]
            color: $light-mode-secondary-text-color
        @each $name, $color in $light-mode-colors
            &.is-color-#{$name}:not([disabled])
                color: $color
    .color-mode-light
        @each $name, $color in $light-mode-colors
            &.is-color-#{$name}
                color: $color
                background-color: rgba($color, 0.15)
                &:hover:not([disabled])
                    background-color: rgba($color, 0.2)
                &:active:not([disabled])
                    background-color: rgba($color, 0.28)
                &[disabled]
                    color: $light-mode-secondary-text-color
    .color-mode-filled
        @each $name, $color in $light-mode-colors
            &.is-color-#{$name}
                color: $light-mode-text-inverted-color
                background-color: $color
                &:hover:not([disabled])
                    background-color: rgba($color, 0.88)
                &:active:not([disabled])
                    background-color: rgba($color, 0.8)
                &[disabled]
                    background-color: mix($color, #FFFFFF)
@media (prefers-color-scheme: dark)
    .color-mode-transparent
        background-color: rgba(#000000, 0)
        color: $dark-mode-text-color
        &:hover:not([disabled])
            background-color: rgba(255, 255, 255, 0.09)
        &:active:not([disabled])
            background-color: rgba(255, 255, 255, 0.13)
        &[disabled]
            color: $dark-mode-secondary-text-color
        @each $name, $color in $dark-mode-colors
            &.is-color-#{$name}:not([disabled])
                color: $color
    .color-mode-light
        @each $name, $color in $dark-mode-colors
            &.is-color-#{$name}
                color: $color
                background-color: rgba($color, 0.15)
                &:hover:not([disabled])
                    background-color: rgba($color, 0.2)
                &:active:not([disabled])
                    background-color: rgba($color, 0.28)
                &[disabled]
                    color: $dark-mode-secondary-text-color
    .color-mode-filled
        @each $name, $color in $dark-mode-colors
            &.is-color-#{$name}
                color: $dark-mode-text-inverted-color
                background-color: $color
                &:hover:not([disabled])
                    background-color: rgba($color, 0.88)
                &:active:not([disabled])
                    background-color: rgba($color, 0.8)
                &[disabled]
                    background-color: mix($color, #000000)
</style>
