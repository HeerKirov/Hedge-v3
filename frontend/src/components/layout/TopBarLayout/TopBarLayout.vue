<script setup lang="ts">
import { TopBar, useSideLayoutState } from "@/components/layout"

// == Top Bar Layout 顶栏结构布局 ==
// 用于SideLayout的主要区域的布局，将内容区分割为上面的顶栏和下面的主要内容区两部分。
// 顶栏内容放入slot#top-bar，主要内容放入slot#default。

defineProps<{
    expanded?: boolean
}>()

defineEmits<{
    (e: "update:expanded", v: boolean): void
}>()

const { isOpen } = useSideLayoutState()

</script>

<template>
    <div :class="$style['top-bar-layout']">
        <div :class="$style['main-content']">
            <slot/>
        </div>
        <transition :enter-active-class="$style['transition-active']" :leave-active-class="$style['transition-active']" :enter-from-class="$style['transition-goal']" :leave-to-class="$style['transition-goal']">
            <div v-if="expanded" :class="$style['expand-background']" @click="$emit('update:expanded', false)"/>
        </transition>
        <transition :enter-active-class="$style['transition-enter-active']" :leave-active-class="$style['transition-leave-active']" :enter-from-class="$style['transition-goal']" :leave-to-class="$style['transition-goal']">
            <div v-if="expanded" :class="$style['expand-area']">
                <slot name="expand"/>
            </div>
        </transition>
        <TopBar v-model:is-side-open="isOpen">
            <slot name="top-bar"/>
        </TopBar>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/color"
@use "@/styles/base/size"

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

    > .expand-background
        position: absolute
        top: size.$title-bar-height
        left: 0
        right: 0
        bottom: 0
        background-color: rgba(0, 0, 0, 0.25)
        @media (prefers-color-scheme: dark)
            background-color: rgba(0, 0, 0, 0.618)
        &.transition-active
            transition: opacity 0.3s
        &.transition-goal
            opacity: 0

    > .expand-area
        position: absolute
        top: size.$title-bar-height
        width: 100%
        min-height: 2rem
        max-height: calc(75% - #{size.$title-bar-height})

        @media (prefers-color-scheme: light)
            background: color.$light-mode-block-color
            border-bottom: solid 1px color.$light-mode-border-color
            box-shadow: 0 0.5em 1em -0.125em rgba(color.$black, 0.1), 0 0px 0 1px rgba(color.$black, 0.02)

        @media (prefers-color-scheme: dark)
            background: color.$dark-mode-block-color
            border-bottom: solid 1px color.$dark-mode-border-color
            box-shadow: 0 0.5em 1em -0.125em rgba(color.$white, 0.1), 0 0px 0 1px rgba(color.$white, 0.02)

        &.transition-enter-active
            transition: transform 0.15s ease-in
        &.transition-leave-active
            transition: transform 0.15s ease-out
        &.transition-goal
            transform: translateY(-100%)
</style>
