<script setup lang="ts">
import { Flex } from "@/components/layout"
import { NativeTheme } from "@/functions/ipc-client"

defineProps<{
    theme?: NativeTheme
}>()

defineEmits<{
    (e: "update:theme", value: NativeTheme): void
}>()

</script>

<template>
    <Flex horizontal="stretch">
        <div :class="{[$style['theme-select-card']]: true, [$style.selected]: theme === 'light'}" @click="$emit('update:theme', 'light')">
            <div :class="$style['light-mode']"/>
            亮色模式
        </div>
        <div :class="{[$style['theme-select-card']]: true, [$style.selected]: theme === 'dark'}"  @click="$emit('update:theme', 'dark')">
            <div :class="$style['dark-mode']"/>
            暗色模式
        </div>
        <div :class="{[$style['theme-select-card']]: true, [$style.selected]: theme === 'system'}"  @click="$emit('update:theme', 'system')">
            <div :class="$style['system-mode']"/>
            跟随系统
        </div>
    </Flex>
</template>

<style module lang="sass">
@use "@/styles/base/color"
@use "@/styles/base/size"

.theme-select-card
    width: 30%
    text-align: center
    &.selected > div
        border: solid 3px color.$light-mode-primary
        @media (prefers-color-scheme: dark)
            border-color: color.$dark-mode-primary
    > div
        box-sizing: border-box
        border-radius: size.$radius-size-std
        border: solid 1px color.$light-mode-border-color
        height: 6rem
    > .light-mode
        background-color: color.$light-mode-block-color
    > .dark-mode
        background-color: color.$dark-mode-block-color
    > .system-mode
        background: linear-gradient(to right bottom, color.$light-mode-block-color, color.$light-mode-block-color 50%, color.$dark-mode-block-color 51%, color.$dark-mode-block-color)
</style>
