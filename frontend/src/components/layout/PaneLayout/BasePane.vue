<script setup lang="ts">
import { Button } from "@/components/universal"
import { BottomLayout } from "@/components/layout"

// == Base Pane 侧边面板基础布局 ==
// 适用于PaneLayout的侧边面板的基础布局。它提供了一个右上角的关闭按钮，和一个可滚动的、边距适中的内容区域。
// 将主要内容放入slot#default；有些标题内容可以放入slot#title，它们将处在和关闭按钮的同一行上。
// 如果没有slot#title，也不显示关闭按钮，那么主要区域会顶到最顶上。

withDefaults(defineProps<{
    showCloseButton?: boolean
}>(), {
    showCloseButton: true
})

defineEmits<{
    (e: "close"): void
}>()

</script>

<template>
    <BottomLayout :class="$style['base-pane']" 
                  :top-class="!$slots.title && !showCloseButton ? $style['top-content-full'] : $style['top-content']" 
                  :container-class="$style['content']" 
                  :bottom-class="$style['bottom-content']">
        <template #gap>
            <Button v-if="showCloseButton" :class="$style['close-button']" icon="close" square @click="$emit('close')"/>
            <div v-if="!!$slots.title" :class="$style['title']">
                <slot name="title"/>
            </div>
        </template>
        <template #top>
            <slot name="top"/>
        </template>
        <template #default>
            <slot/>
        </template>
        <template v-if="!!$slots.bottom" #bottom>
            <slot name="bottom"/>
        </template>
    </BottomLayout>
</template>

<style module lang="sass">
@import "../../../styles/base/color"
@import "../../../styles/base/size"

.base-pane
    position: relative
    box-sizing: border-box
    background-color: $light-mode-block-color
    border-left: solid 1px $light-mode-border-color
    @media (prefers-color-scheme: dark)
        background-color: $dark-mode-block-color
        border-left-color: $dark-mode-border-color

    > .close-button
        position: absolute
        top: $spacing-1
        right: $spacing-1

    > .title
        position: absolute
        top: $spacing-1
        left: $spacing-1
        right: calc(#{$spacing-1 * 2} + #{$element-height-std})
        height: $element-height-std

    > .top-content
        box-sizing: border-box
        padding: calc(#{$spacing-1 * 2} + #{$element-height-std}) $spacing-2 $spacing-1 $spacing-2
        max-height: 75%
    
    > .top-content-full
        box-sizing: border-box
        padding: $spacing-1 $spacing-2
        max-height: 75%

    > .content
        box-sizing: border-box
        padding-left: $spacing-3
        padding-right: $spacing-3

    > .bottom-content
        box-sizing: border-box
        padding: $spacing-1

</style>
