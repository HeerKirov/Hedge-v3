<script setup lang="ts">

defineProps<{
    size?: "small" | "std" | "large"
    direction?: "horizontal" | "vertical"
    spacing?: number
}>()

</script>

<template>
    <div :class="[$style.separator, $style[`is-direction-${direction ?? 'vertical'}`], $style[`is-size-${size ?? 'std'}`], $style[`spacing-${spacing ?? 1}`]]"/>
</template>

<style module lang="sass">
@import "../../styles/base/size"
@import "../../styles/base/color"

.separator.is-direction-vertical
    width: 0
    flex: 0 0 auto
    display: inline-block
    box-sizing: border-box
    vertical-align: middle
    border-left: solid 1px $light-mode-border-color
    @media (prefers-color-scheme: dark)
        border-left-color: $dark-mode-border-color

    @each $name, $size in $spacing-map
        &.spacing-#{$name}
            margin: 0 $size
    &.is-size-small
        height: #{$element-height-small * 0.8}
    &.is-size-std
        height: #{$element-height-std * 0.8}
    &.is-size-large
        height: #{$element-height-large * 0.8}

.separator.is-direction-horizontal
    height: 0
    width: 100%
    flex: 0 0 auto
    display: block
    box-sizing: border-box
    border-top: solid 1px $light-mode-border-color
    @media (prefers-color-scheme: dark)
        border-top-color: $dark-mode-border-color
    
    @each $name, $size in $spacing-map
        &.spacing-#{$name}
            margin: $size 0
</style>
