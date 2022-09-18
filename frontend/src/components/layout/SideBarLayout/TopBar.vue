<script setup lang="ts">
import { Button } from "@/components/universal"
import { useSideLayoutState } from "./context"

const { isOpen } = useSideLayoutState()


</script>

<template>
    <div :class="$style['top-bar']">
        <transition :enter-from-class="$style['transition-enter-from']" :leave-to-class="$style['transition-leave-to']" :enter-active-class="$style['transition-enter-active']" :leave-active-class="$style['transition-leave-active']">
            <Button v-if="!isOpen" :class="$style['collapse-button']" square icon="bars" @click="isOpen = true"/>
        </transition>
        <div :class="{[$style.content]: true, [$style['has-cl-button']]: !isOpen}">
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
    position: relative
    width: 100%
    height: $title-bar-height
    transition: padding-left $transaction-time ease
    background-color: $light-mode-block-color
    border-bottom: solid 1px $light-mode-border-color
    @media (prefers-color-scheme: dark)
        background-color: $dark-mode-block-color
        border-bottom-color: $dark-mode-border-color

.collapse-button
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


    //在侧边栏折叠时，显示折叠按钮，需要留出左侧的空隙
    &.has-cl-button
        left: #{$element-height-std + $content-margin-size * 2}
    //在侧边栏展开时，不显示折叠按钮，不用留出空隙
    &:not(.has-cl-button)
        left: $content-margin-size
</style>
