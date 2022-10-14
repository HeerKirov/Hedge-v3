<script setup lang="ts">
import { Button } from "@/components/universal"
import { BottomLayout } from "@/components/layout"
import { useSideLayoutState } from "./context"

// == Side Bar 侧边栏内容布局 ==
// 适配SideLayout的侧边栏内容布局。它的最上一行是collapse按钮，中间是边距适中、可滚动的主要内容区域，最底部有一个按钮区。
// 主要内容放入slot#default，按钮区内容放入slot#bottom。
// collapse按钮直接使用useSideLayoutState与布局状态连接。

const { isOpen } = useSideLayoutState()

const switchSideBar = () => isOpen.value = !isOpen.value

</script>

<template>
    <div :class="$style['side-bar']">
        <Button :class="$style['collapse-button']" icon="bars" square @click="switchSideBar"/>
        <BottomLayout :class="$style['bottom-layout']">
            <div class="px-1">
                <slot/>
            </div>
            <template #bottom>
                <div v-if="!!$slots.bottom" :class="$style['bottom']">
                    <slot name="bottom"/>
                </div>
            </template>
        </BottomLayout>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/color"
@import "../../../styles/base/size"

.side-bar
    position: relative
    width: 100%
    height: 100%
    background-color: $light-mode-block-color
    border-right: solid 1px $light-mode-border-color
    @media (prefers-color-scheme: dark)
        background-color: $dark-mode-block-color
        border-right-color: $dark-mode-border-color

.collapse-button
    position: absolute
    right: $spacing-1
    top: $spacing-1

.bottom-layout
    position: absolute
    top: $title-bar-height
    height: calc(100% - $title-bar-height)
    .bottom
        box-sizing: border-box
        border-top: solid 1px $light-mode-border-color
        padding: $spacing-1
        width: 100%
        @media (prefers-color-scheme: dark)
            border-top-color: $dark-mode-border-color
</style>
