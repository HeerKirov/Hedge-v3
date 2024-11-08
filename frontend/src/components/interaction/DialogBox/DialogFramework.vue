<script setup lang="ts">
import DialogInternal from "./DialogInternal.vue"

defineOptions({
    inheritAttrs: false
})

const props = defineProps<{
    visible?: boolean
    position?: "absolute" | "fixed"
    closeOnEscape?: boolean
    closeOnClickOutside?: boolean
    interceptEvent?: boolean
    enterActiveClass?: string
    leaveActiveClass?: string
    enterFromClass?: string
    leaveToClass?: string
    backgroundClass?: string
    dialogClass?: string
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

<template>
    <transition :enter-active-class="enterActiveClass" :leave-active-class="leaveActiveClass" :enter-from-class="enterFromClass" :leave-to-class="leaveToClass">
        <div v-if="visible" :class="[$style.background, backgroundClass, position === 'absolute' ? $style['absolute'] : undefined]" @click="closeByOutside">
            <div :class="$style['top-bar-region']"/>
        </div>
    </transition>
    <transition :enter-active-class="enterActiveClass" :leave-active-class="leaveActiveClass" :enter-from-class="enterFromClass" :leave-to-class="leaveToClass">
        <DialogInternal v-if="visible" v-bind="$attrs" :class="dialogClass" :position="position" :close-on-escape="closeOnEscape" :intercept-event="interceptEvent" @close="close">
            <slot/>
        </DialogInternal>
    </transition>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.background
    z-index: 90
    position: fixed
    &.absolute
        position: absolute
    width: 100%
    height: 100%
    left: 0
    top: 0

    .top-bar-region
        position: absolute
        width: 100%
        height: size.$title-bar-height
        left: 0
        top: 0
        -webkit-app-region: none
</style>
