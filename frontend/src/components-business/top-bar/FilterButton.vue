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
@use "@/styles/base/color"
@use "@/styles/base/size"

.filter-button
    flex: 0 0 auto
    border-bottom: solid 1px color.$light-mode-border-color
    @media (prefers-color-scheme: dark)
        border-bottom-color: color.$dark-mode-border-color

.button
    box-sizing: border-box
    vertical-align: middle
    white-space: nowrap
    display: flex
    flex-wrap: nowrap
    align-items: center
    justify-content: center
    border-radius: size.$radius-size-std
    font-size: size.$font-size-std
    height: size.$element-height-std
    padding: 0 0.7em
    &.square
        width: size.$element-height-std
        padding: 0 0
    @media (prefers-color-scheme: light)
        background-color: rgba(#ffffff, 0)
        color: color.$light-mode-text-color
        &:hover
            background-color: rgba(45, 50, 55, 0.09)
        &:active
            background-color: rgba(45, 50, 55, 0.13)
    @media (prefers-color-scheme: dark)
        background-color: rgba(#000000, 0)
        color: color.$dark-mode-text-color
        &:hover
            background-color: rgba(255, 255, 255, 0.09)
        &:active
            background-color: rgba(255, 255, 255, 0.13)
</style>
