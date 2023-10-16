<script setup lang="ts">
import { Button } from "@/components/universal"
import { useButtonContext } from "./context"
import StagingPostCallout from "./StagingPostCallout.vue"

const { stagingPostCount, dropEvents, divRef, calloutRef, visible, active } = useButtonContext()

</script>

<template>
    <div ref="divRef" :class="$style.root">
        <Button :class="stagingPostCount ? 'px-2' : undefined" :square="!stagingPostCount" 
                :mode="visible ? 'filled' : active ? 'light' : undefined" :type="(visible || active) ? 'primary' : undefined" 
                icon="clipboard" v-bind="dropEvents" @click="visible = !visible">
            <b v-if="!!stagingPostCount">{{ stagingPostCount }}</b>
        </Button>
        <Teleport to="#app">
            <transition :enter-active-class="$style['transition-enter-active']" 
                    :leave-active-class="$style['transition-leave-active']" 
                    :enter-from-class="$style['transition-enter-from']" 
                    :leave-to-class="$style['transition-leave-to']">
                <StagingPostCallout v-if="visible" ref="calloutRef" :class="$style.popup" @close="visible = false"/>
            </transition>
        </Teleport>
    </div>
</template>

<style module lang="sass">
.root
    display: inline-block
    position: relative

.popup
    &.transition-enter-from
        transform: translateY(1rem)
    &.transition-leave-to
        transform: translateY(1rem)
        opacity: 0
    &.transition-enter-active
        transition: transform 0.15s ease-out
    &.transition-leave-active
        transition: transform 0.15s ease-in, opacity 0.15s ease-in
</style>