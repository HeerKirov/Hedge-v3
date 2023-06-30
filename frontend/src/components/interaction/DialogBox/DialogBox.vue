<script setup lang="ts">
import { Block } from "@/components/universal"
import DialogFramework from "./DialogFramework.vue"

defineOptions({
    inheritAttrs: false
})

defineProps<{
    visible?: boolean
    position?: "absolute" | "fixed"
    overflow?: "hidden" | "auto" | "default"
    closeOnEscape?: boolean
    closeOnClickOutside?: boolean
    interceptEvent?: boolean
}>()

defineEmits<{
    (e: "close"): void
}>()

</script>

<template>
    <DialogFramework :visible="visible" :position="position" 
                     :close-on-click-outside="closeOnClickOutside" 
                     :close-on-escape="closeOnEscape" 
                     :intercept-event="interceptEvent"
                     :background-class="$style.background" 
                     :dialog-class="$style.dialog" 
                     :enter-active-class="$style['transition-enter-active']" 
                     :leave-active-class="$style['transition-leave-active']" 
                     :enter-from-class="$style['transition-enter-from']" 
                     :leave-to-class="$style['transition-leave-to']" 
                     @close="$emit('close')">
        <Block :overflow="overflow ?? 'default'" v-bind="$attrs">
            <slot/>
        </Block>
    </DialogFramework>
</template>

<style module lang="sass">
.background
    background-color: rgba(233, 233, 233, 0.618)
    @media (prefers-color-scheme: dark)
        background-color: rgba(0, 0, 0, 0.618)
    &.transition-enter-active,
    &.transition-leave-active
        transition: opacity 0.3s ease
    &.transition-enter-from,
    &.transition-leave-to
        opacity: 0

.dialog
    &.transition-enter-active
        transition: transform 0.1s ease-out
    &.transition-leave-active
        transition: transform 0.1s ease-in, opacity 0.15s ease-in
    &.transition-enter-from
        transform: translate(-50%, calc(1rem - 50%))
    &.transition-leave-to
        transform: translate(-50%, calc(1rem - 50%))
        opacity: 0

</style>
