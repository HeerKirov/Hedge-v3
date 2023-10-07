<script setup lang="ts">
import { Block } from "@/components/universal"
import { DialogFramework } from "@/components/interaction"
import { useInternalService } from "./context"
import ImagePreview from "./ImagePreview/ImagePreview.vue"

const { context, close } = useInternalService()

</script>

<template>
    <DialogFramework :visible="context !== null" close-on-click-outside close-on-escape @close="close"
                     :background-class="$style.background" 
                     :dialog-class="$style.dialog" 
                     :enter-active-class="$style['transition-enter-active']" 
                     :leave-active-class="$style['transition-leave-active']" 
                     :enter-from-class="$style['transition-enter-from']" 
                     :leave-to-class="$style['transition-leave-to']">
        <Block :class="$style['root-container']" >
            <ImagePreview v-if="context!.preview === 'image'" :context="context!" @close="close"/>
        </Block>
    </DialogFramework>
</template>

<style module lang="sass">
.background
    background-color: rgba(233, 233, 233, 0.3)
    @media (prefers-color-scheme: dark)
        background-color: rgba(0, 0, 0, 0.3)
    &.transition-enter-active,
    &.transition-leave-active
        transition: opacity 0.3s ease
    &.transition-enter-from,
    &.transition-leave-to
        opacity: 0

.dialog
    &.transition-enter-active
        transition: transform 0.12s ease-out
    &.transition-leave-active
        transition: transform 0.12s ease-in, opacity 0.15s ease-in
    &.transition-enter-from
        transform: translate(-50%, -50%) scale(0.6)
    &.transition-leave-to
        transform: translate(-50%, -50%) scale(0.4)
        opacity: 0

.root-container
    width: 90vw
    height: 90vh
    border-width: 3px
</style>