<script setup lang="ts">
import { Button, Icon } from "@/components/universal"
import { useButtonContext } from "./context"
import BackgroundTaskCallout from "./BackgroundTaskCallout.vue"

const { divRef, calloutRef, visible, backgroundTaskCount } = useButtonContext()

</script>

<template>
    <div ref="divRef" :class="$style.root">
        <Button square :mode="visible ? 'filled' : undefined" :type="visible ? 'primary' : undefined" @click="visible = !visible">
            <Icon icon="flask" :fade="!!backgroundTaskCount && !visible" :beat="!!backgroundTaskCount && !visible"/>
        </Button>
        <Teleport to="#app">
            <transition :enter-active-class="$style['transition-enter-active']" 
                    :leave-active-class="$style['transition-leave-active']" 
                    :enter-from-class="$style['transition-enter-from']" 
                    :leave-to-class="$style['transition-leave-to']">
                <BackgroundTaskCallout v-if="visible" ref="calloutRef" :class="$style.popup" @close="visible = false"/>
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