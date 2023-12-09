<script setup lang="ts">
import { computed } from "vue"
import { Button } from "@/components/universal"
import { useAppEnv, useFullscreen } from "@/functions/app"
import { useSideLayoutState } from "./context"

// == Top Bar 通用顶栏内容布局 ==
// 适配SideLayout的顶栏内容布局，在主要内容区域中隔出顶栏区域。
// 此区域最左侧有一个collapse按钮，且只会在侧边栏关闭时显示。其余区域则是自动适应大小和边距的内容区。
// 主要内容放入slot#default。

const { platform } = useAppEnv()

const { isOpen } = useSideLayoutState()

const fullscreen = useFullscreen()

const hasDarwinButton = computed(() => platform === "darwin" && !isOpen.value && !fullscreen.value)

</script>

<template>
    <div :class="[{[$style['has-darwin-button']]: hasDarwinButton}, $style['top-bar']]">
        <transition :enter-from-class="$style['transition-enter-from']" :leave-to-class="$style['transition-leave-to']" :enter-active-class="$style['transition-enter-active']" :leave-active-class="$style['transition-leave-active']">
            <Button v-if="!isOpen" :class="$style['collapse-button']" square icon="bars" @click="isOpen = true"/>
        </transition>
        <div :class="[{[$style['has-cl-button']]: !isOpen}, $style.content]">
            <slot/>
        </div>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/size"
@import "../../../styles/base/color"

$transaction-time: 0.4s
$content-margin-size: calc(($title-bar-height - $element-height-std) / 2)

.top-bar
    -webkit-app-region: drag
    position: relative
    width: 100%
    height: $title-bar-height
    transition: padding-left $transaction-time ease
    background-color: $light-mode-block-color
    border-bottom: solid 1px $light-mode-border-color
    @media (prefers-color-scheme: dark)
        background-color: $dark-mode-block-color
        border-bottom-color: $dark-mode-border-color

    //macOS平台的内容区域布局。左侧留出红绿灯的宽度
    &.has-darwin-button
        padding-left: $macos-buttons-width

.collapse-button
    -webkit-app-region: none
    margin-left: $spacing-1
    margin-top: $spacing-1
    &.transition-enter-active,
    &.transition-leave-active
        transition: transform $transaction-time ease
    &.transition-enter-from,
    &.transition-leave-to
        transform: translateX(-200%)

.content
    position: absolute
    top: $content-margin-size
    height: $element-height-std
    right: $spacing-1
    transition: left $transaction-time ease
    box-sizing: border-box

.top-bar:not(.has-darwin-button) > .content
    //在侧边栏折叠时，显示折叠按钮，需要留出左侧的空隙
    &.has-cl-button
        left: #{$element-height-std + $content-margin-size * 2}
    //在侧边栏展开时，不显示折叠按钮，不用留出空隙
    &:not(.has-cl-button)
        left: $content-margin-size

.top-bar.has-darwin-button > .content
    //在侧边栏折叠时，显示折叠按钮，需要留出左侧的空隙
    &.has-cl-button 
        left: #{$element-height-std + $content-margin-size * 2 + $macos-buttons-width}
    //在侧边栏展开时，不显示折叠按钮，不用留出空隙
    &:not(.has-cl-button) 
        left: #{$content-margin-size + $macos-buttons-width}
</style>
