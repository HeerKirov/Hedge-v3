<script setup lang="ts">
import { useViewStackContext } from "./context"
import { StackViewInfo } from "./definition"
import ViewContainer from "./ViewContainer.vue"
import { computed } from "vue"

const { stacks } = useViewStackContext()

const splitStacks = computed<{pages: StackViewInfo[], top: StackViewInfo} | null>(() => {
    if(stacks.value.length <= 0) {
        return null
    }else{
        const pages = stacks.value.slice(0, stacks.value.length - 1)
        const top = stacks.value[stacks.value.length - 1]
        return {pages, top}
    }
})

</script>

<template>
    <transition-group :enter-from-class="$style['transition-enter-from']"
                      :leave-to-class="$style['transition-leave-to']"
                      :enter-active-class="$style['transition-enter-active']"
                      :leave-active-class="$style['transition-leave-active']">
        <template v-if="splitStacks !== null">
            <ViewContainer v-for="(page, i) in splitStacks.pages" :key="i" :class="$style.container" :stack-index="i" :stack-view-info="page" hidden/>
            <div :key="`background-cover-${splitStacks.pages.length}`" :class="$style['background-cover']"/>
            <ViewContainer :class="$style.container" :stack-index="splitStacks.pages.length" :stack-view-info="splitStacks.top"/>
        </template>
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
