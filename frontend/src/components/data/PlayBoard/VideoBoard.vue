<script setup lang="ts">
import { reactive, ref, watch } from "vue"
import { Button } from "@/components/universal"
import { useInterceptedKey } from "@/modules/keyboard"
import { useMouseHover } from "@/utils/sensors"
import { usePlayControl, useVolumeControl } from "./video"
import VideoControls from "./VideoControls.vue"

const props = defineProps<{
    src: string
    arrowEnabled: boolean
}>()

const arrowLeftHover = props.arrowEnabled ? useMouseHover() : {hover: undefined, onMouseover: undefined, onMouseleave: undefined}

const arrowRightHover = props.arrowEnabled ? useMouseHover() : {hover: undefined, onMouseover: undefined, onMouseleave: undefined}

const videoRef = ref<HTMLMediaElement>()

const state = reactive({
    playing: true,
    volume: 1,
    muted: false,
    currentTime: 0,
    duration: NaN
})

const { playOrPause, fastForward, fastRewind, seek, pausedEvent, playingEvent, durationChangeEvent, timeUpdateEvent } = usePlayControl(videoRef, state)

const { updateVolume, updateMuted } = useVolumeControl(videoRef, state)

watch(videoRef, dom => {
    if(dom !== undefined) {
        state.playing = !dom.paused
        state.currentTime = dom.currentTime
        state.duration = dom.duration
        dom.volume = state.volume
        dom.muted = state.muted
    }
})

useInterceptedKey(["Space", "ArrowLeft", "ArrowRight"], e => {
    if(e.key === "Space") {
        playOrPause()
    }else if(e.key === "ArrowLeft") {
        fastRewind()
    }else if(e.key === "ArrowRight") {
        fastForward()
    }
})

</script>

<template>
    <div :class="$style.view">
        <video ref="videoRef" key="video" loop autoplay :src="src"
               @dblclick="playOrPause" @pause="pausedEvent" @playing="playingEvent"
               @durationchange="durationChangeEvent" @timeupdate="timeUpdateEvent"/>
        <div v-if="arrowEnabled" :class="$style['arrow-left']" @mouseover="arrowLeftHover.onMouseover" @mouseleave="arrowLeftHover.onMouseleave">
            <Button v-if="arrowLeftHover?.hover?.value" square icon="angle-left" @click="$emit('arrow', 'left')"/>
        </div>
        <div v-if="arrowEnabled" :class="$style['arrow-right']" @mouseover="arrowRightHover.onMouseover" @mouseleave="arrowRightHover.onMouseleave">
            <Button v-if="arrowRightHover?.hover?.value" square icon="angle-right" @click="$emit('arrow', 'right')"/>
        </div>
        <VideoControls :volume="state.volume" :muted="state.muted" :current-time="state.currentTime" :duration="state.duration" :playing="state.playing"
                       @play-or-pause="playOrPause" @seek="seek" @update:volume="updateVolume" @update:muted="updateMuted"/>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/color"
@import "../../../styles/base/size"

.view
    position: relative
    width: 100%
    height: 100%
    background-color: $black
    
    > video
        width: 100%
        height: 100%
    
    .arrow-left
        position: absolute
        left: 0
        top: 0
        bottom: 0
        width: calc(#{$element-height-large} + #{$spacing-4 * 2})
        > button
            position: absolute
            left: $spacing-4
            top: $spacing-4
            bottom: $spacing-4
            width: $element-height-large
            height: auto
    
    .arrow-right
        position: absolute
        right: 0
        top: 0
        bottom: 0
        width: calc(#{$element-height-large} + #{$spacing-4 * 2})
        > button
            position: absolute
            right: $spacing-4
            top: $spacing-4
            bottom: $spacing-4
            width: $element-height-large
            height: auto
</style>
