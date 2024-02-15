<script setup lang="ts">
import { reactive, ref, watch } from "vue"
import { useInterceptedKey } from "@/modules/keyboard"
import { usePlayControl, useVolumeControl } from "./video"
import VideoControls from "./VideoControls.vue"

defineProps<{
    src: string
}>()

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
</style>
