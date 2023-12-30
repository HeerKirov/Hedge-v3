<script setup lang="ts">
import { computed } from "vue"
import { Button } from "@/components/universal"
import { useAppEnv, useFullscreen } from "@/functions/app"
import { useSideLayoutState } from "./context"

// == Side Bar 侧边栏内容布局 ==
// 适配SideLayout的侧边栏内容布局。它的最上一行是collapse按钮，中间是边距适中、可滚动的主要内容区域，最底部有一个按钮区。
// 主要内容放入slot#default，按钮区内容放入slot#bottom。
// collapse按钮直接使用useSideLayoutState与布局状态连接。

withDefaults(defineProps<{
    scrollable?: boolean
}>(), {
    scrollable: true
})

const { isOpen } = useSideLayoutState()

const { platform } = useAppEnv()

const fullscreen = useFullscreen()

const hasDarwinButton = computed(() => platform === "darwin" && !isOpen.value && !fullscreen.value)

const switchSideBar = () => isOpen.value = !isOpen.value

</script>

<template>
    <div :class="$style['side-bar']">
        <div :class="$style['app-region-area']">
            <div :class="{[$style['top-bar']]: true, [$style['has-darwin-button']]: hasDarwinButton}">
                <slot name="top-bar"/>
                <Button class="no-app-region" icon="bars" square @click="switchSideBar"/>
            </div>
        </div>
        <div :class="{[$style['content']]: true, [$style['no-bottom']]: !$slots.bottom, [$style.scrollable]: scrollable}">
            <slot/>
        </div>
        <div v-if="!!$slots.bottom" :class="$style['bottom']">
            <slot name="bottom"/>
        </div>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/color"
@import "../../../styles/base/size"

$content-margin-size: calc(($title-bar-height - $element-height-std) / 2)

.side-bar
    position: relative
    width: 100%
    height: 100%
    background-color: $light-mode-block-color
    border-right: solid 1px $light-mode-border-color
    @media (prefers-color-scheme: dark)
        background-color: $dark-mode-block-color
        border-right-color: $dark-mode-border-color

.app-region-area
    -webkit-app-region: drag
    position: absolute
    left: 0
    top: 0
    width: 100%
    height: $title-bar-height
    border-bottom: solid 1px $light-mode-border-color
    @media (prefers-color-scheme: dark)
        border-bottom-color: $dark-mode-border-color

    .top-bar
        position: absolute
        display: flex
        flex-wrap: nowrap
        justify-content: flex-end
        top: $content-margin-size
        left: $content-margin-size
        right: $content-margin-size
        height: $element-height-std
        //macOS平台的内容区域布局。左侧留出红绿灯的宽度
        &.has-darwin-button
            left: $macos-buttons-width

.content
    position: absolute
    left: 0
    top: $title-bar-height
    height: calc(100% - #{$title-bar-height + $element-height-std + 8px + 1px})
    padding: $spacing-1 $spacing-2
    width: 100%
    &.scrollable
        overflow-y: auto
    &.no-bottom
        height: calc(100% - $title-bar-height)

.bottom
    position: absolute
    border-top: solid 1px $light-mode-border-color
    padding: $spacing-1
    width: 100%
    bottom: 0
    left: 0
    height: #{$element-height-std + 8px + 1px}
    @media (prefers-color-scheme: dark)
        border-top-color: $dark-mode-border-color
</style>
