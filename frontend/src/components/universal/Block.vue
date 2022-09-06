<script setup lang="ts">
import { computed, useCssModule } from "vue"
import { Colors } from "@/constants/ui"

const props = defineProps<{
    color?: Colors
    mode?: "transparent" | "light" | "filled" | "shadow"
}>()

//TODO 完成不同的mode

const style = useCssModule()

const divClass = computed(() => ([
    style.block,
    props.color ? style[`is-color-${props.color}`] : null
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
    border: solid 1px $light-mode-border-color
    background-color: $light-mode-block-color
    color: $light-mode-text-color
    @media (prefers-color-scheme: dark)
        border-color: $dark-mode-border-color
        background-color: $dark-mode-block-color
        color: $dark-mode-text-color

@media (prefers-color-scheme: light)
    @each $name, $color in $light-mode-colors
        .is-color-#{$name}
            border-color: $color
@media (prefers-color-scheme: dark)
    @each $name, $color in $dark-mode-colors
        .is-color-#{$name}
            border-color: $color
</style>
