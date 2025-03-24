<script setup lang="ts">
import { TopBar } from "@/components/layout"

// == Top Bar Collapse Layout 顶栏结构布局 ==
// 将内容区分割为上面的顶栏和下面的主要内容区两部分。可以通过参数折叠顶栏。

defineProps<{
    collapsed?: boolean
    isEmbed?: boolean
}>()

</script>

<template>
    <div :class="$style['top-bar-layout']">
        <div :class="{[$style['main-content']]: true, [$style.collapsed]: collapsed}">
            <slot/>
        </div>
        <TopBar :class="{[$style['top-bar']]: true, [$style.collapsed]: collapsed}" :show-side-collapse-button="false" :is-side-open="false" :isEmbed>
            <slot name="top-bar"/>
        </TopBar>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/color"
@use "@/styles/base/size"

$transaction-time: 0.25s

.top-bar-layout
    position: relative
    width: 100%
    height: 100%
    background-color: color.$light-mode-background-color
    @media (prefers-color-scheme: dark)
        background-color: color.$dark-mode-background-color

    > .main-content
        position: absolute
        top: size.$title-bar-height
        left: 0
        right: 0
        bottom: 0
        transition: top $transaction-time ease
        &.collapsed
            top: 0

    > .top-bar
        transition: transform $transaction-time ease
        &.collapsed
            transform: translateY(#{- size.$title-bar-height})
</style>
