<script setup lang="ts">
import { useInternalService } from "./context"
import EmbedPreviewInternal from "./EmbedPreviewInternal.vue"

const { context } = useInternalService()

</script>

<template>
    <transition :enter-active-class="$style['transition-enter-active']"
                :leave-active-class="$style['transition-leave-active']"
                :enter-from-class="$style['transition-enter-from']"
                :leave-to-class="$style['transition-leave-to']">
        <div v-if="context !== null" :class="$style.background"/>
    </transition>
    <transition :enter-active-class="$style['transition-enter-active']"
                :leave-active-class="$style['transition-leave-active']"
                :enter-from-class="$style['transition-enter-from']"
                :leave-to-class="$style['transition-leave-to']">
        <div v-if="context !== null" :class="$style['embed-preview']">
            <EmbedPreviewInternal/>
        </div>
    </transition>
</template>

<style module lang="sass">
@import "../../styles/base/color"

.embed-preview
    position: absolute
    left: 50%
    top: 50%
    width: 100%
    height: 100%
    transform: translate(-50%, -50%)

    &.transition-enter-active
        transition: transform 0.12s ease-out
    &.transition-leave-active
        transition: transform 0.12s ease-in, opacity 0.15s ease-in
    &.transition-enter-from
        transform: translate(-50%, -50%) scale(0.6)
    &.transition-leave-to
        transform: translate(-50%, -50%) scale(0.4)
        opacity: 0

.background
    position: absolute
    left: 0
    top: 0
    width: 100%
    height: 100%
    background-color: $light-mode-background-color
    @media (prefers-color-scheme: dark)
        background-color: $dark-mode-background-color

    &.transition-enter-active,
    &.transition-leave-active
        transition: opacity 0.25s ease
    &.transition-enter-from,
    &.transition-leave-to
        opacity: 0
        pointer-events: none
</style>