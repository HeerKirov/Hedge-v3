<script setup lang="ts">
import { useStackedView } from "./context"
import ViewContainer from "./ViewContainer.vue"

const { current } = useStackedView()

</script>

<template>
    <transition-group :enter-from-class="$style['transition-enter-from']"
                     :leave-to-class="$style['transition-leave-to']"
                     :enter-active-class="$style['transition-enter-active']"
                     :leave-active-class="$style['transition-leave-active']">
        <div v-if="!!current" :class="$style['background-cover']"/>
        <ViewContainer v-if="!!current" :class="$style.container" :stack-view-info="current"/>
    </transition-group>
</template>

<style module lang="sass">
.container
    &.transition-enter-from
        transform: translateY(50vh)
    &.transition-leave-to
        transform: translateY(100vh)
    &.transition-enter-active
        transition: transform 0.15s ease-out
        backface-visibility: hidden
    &.transition-leave-active
        transition: transform 0.3s
        backface-visibility: hidden

.background-cover
    position: absolute
    left: 0
    top: 0
    width: 100vw
    height: 100vh
    background-color: rgba(0, 0, 0, 0.5)

    &.transition-enter-from,
    &.transition-leave-to
        opacity: 0
    &.transition-enter-active
        transition: opacity 0.15s
        backface-visibility: hidden
    &.transition-leave-active
        transition: opacity 0.3s
        backface-visibility: hidden
</style>
