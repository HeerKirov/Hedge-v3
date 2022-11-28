<script setup lang="ts">
import DialogBoxFramework from "./DialogBoxFramework.vue"

const props = defineProps<{
    visible?: boolean
    position?: "absolute" | "fixed"
    overflow?: "hidden" | "auto"
    closeOnEscape?: boolean
    closeOnClickOutside?: boolean
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const close = () => emit('close')

const closeByOutside = () => {
    if(props.closeOnClickOutside) {
        close()
    }
}

</script>

<script lang="ts">
export default {
    inheritAttrs: false
}
</script>

<template>
    <transition :enter-active-class="$style['transition-active']" :leave-active-class="$style['transition-active']" :enter-from-class="$style['transition-goal']" :leave-to-class="$style['transition-goal']">
        <div v-if="visible" :class="{[$style.background]: true, [$style['absolute']]: position === 'absolute'}" @click="closeByOutside"/>
    </transition>
    <transition :enter-active-class="$style['transition-enter-active']" :leave-active-class="$style['transition-leave-active']" :enter-from-class="$style['transition-enter-from']" :leave-to-class="$style['transition-leave-to']">
        <DialogBoxFramework v-if="visible" v-bind="$attrs" :position="position" :overflow="overflow ?? 'hidden'" :close-on-escape="closeOnEscape" @close="close">
            <slot/>
        </DialogBoxFramework>
    </transition>
</template>

<style module lang="sass">
.background
    z-index: 90
    position: fixed
    &.absolute
        position: absolute
    width: 100%
    height: 100%
    left: 0
    top: 0
    background-color: rgba(233, 233, 233, 0.618)
    @media (prefers-color-scheme: dark)
        background-color: rgba(0, 0, 0, 0.618)
    &.transition-active
        transition: opacity 0.3s ease
    &.transition-goal
        opacity: 0

.transition-enter-active
    transition: transform 0.1s ease-out
.transition-leave-active
    transition: transform 0.1s ease-in, opacity 0.15s ease-in
.transition-enter-from
    transform: translate(-50%, calc(1rem - 50%))
.transition-leave-to
    transform: translate(-50%, calc(1rem - 50%))
    opacity: 0

</style>
