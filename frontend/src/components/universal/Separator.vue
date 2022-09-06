<script setup lang="ts">

defineProps<{
    size?: "small" | "std" | "large"
}>()

</script>

<template>
    <div :class="[$style.separator, $style[`is-size-${size ?? 'std'}`]]"/>
</template>

<style module lang="sass">
@import "../../styles/base/size"
@import "../../styles/base/color"

.separator
    width: 0
    margin: 0 $spacing-1
    flex: 0 0 auto
    display: inline-block
    box-sizing: border-box
    vertical-align: middle
    border-left: solid 1px $light-mode-border-color
    @media (prefers-color-scheme: dark)
        border-left-color: $dark-mode-border-color

.is-size-small
    height: #{$element-height-small * 0.8}
.is-size-std
    height: #{$element-height-std * 0.8}
.is-size-large
    height: #{$element-height-large * 0.8}

</style>
