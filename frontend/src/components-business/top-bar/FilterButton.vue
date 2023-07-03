<script setup lang="ts">
import { Icon } from "@/components/universal"
import { Colors } from "@/constants/ui"

defineProps<{
    icon?: string
    type?: Colors
    square?: boolean
}>()

</script>

<template>
    <div :class="$style['filter-button']">
        <div :class="{[$style.button]: true, [$style.square]: square, [`has-text-${type}`]: !!type}">
            <Icon v-if="icon" class="mr-1" :icon="icon"/>
            <slot/>
        </div>
    </div>
</template>

<style module lang="sass">
@import "../../styles/base/color"
@import "../../styles/base/size"

.filter-button
    border-bottom: solid 1px $light-mode-border-color
    @media (prefers-color-scheme: dark)
        border-bottom-color: $dark-mode-border-color

.button
    box-sizing: border-box
    vertical-align: baseline
    white-space: nowrap
    display: flex
    flex-wrap: nowrap
    align-items: center
    justify-content: center
    border-radius: $radius-size-std
    font-size: $font-size-std
    height: $element-height-std
    padding: 0 0.7em
    &.square
        width: $element-height-std
        padding: 0 0
    @media (prefers-color-scheme: light)
        background-color: rgba(#ffffff, 0)
        color: $light-mode-text-color
        &:hover
            background-color: rgba(45, 50, 55, 0.09)
        &:active
            background-color: rgba(45, 50, 55, 0.13)
    @media (prefers-color-scheme: dark)
        background-color: rgba(#000000, 0)
        color: $dark-mode-text-color
        &:hover
            background-color: rgba(255, 255, 255, 0.09)
        &:active
            background-color: rgba(255, 255, 255, 0.13)
</style>
