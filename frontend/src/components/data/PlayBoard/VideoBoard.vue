<script setup lang="ts">
import { reactive, ref, watch } from "vue"
import { remoteIpcClient } from "@/functions/ipc-client"
import { useHttpClient } from "@/functions/app"
import { useInterceptedKey } from "@/modules/keyboard"
import { computedAsync } from "@/utils/reactivity"
import { usePlayControl, useVideoPositionMemory, useVolumeControl } from "./video"
import VideoControls from "./VideoControls.vue"

const props = defineProps<{
    src: string
    immersive: boolean
}>()

const videoRef = ref<HTMLMediaElement>()

const state = reactive({
    playing: true,
    volume: 1,
    muted: false,
    currentTime: 0,
    duration: NaN
})

const client = useHttpClient()

const src = computedAsync<string | undefined>(undefined, async () => {
    if(props.src) {
        const matcher = props.src.match(/archive:\/\/(.*)/)
        if(matcher && matcher) {
            const path = matcher[1]
            const r = await remoteIpcClient.local.checkAndLoadFile(path)
            if(r.ok && !r.data) {
                return client.static.assetsUrl(path)
            }
        }
    }
    return props.src
})

const { playOrPause, fastForward, fastRewind, seek, pausedEvent, playingEvent, durationChangeEvent, timeUpdateEvent } = usePlayControl(videoRef, state)

const { updateVolume, updateMuted } = useVolumeControl(videoRef, state)

useVideoPositionMemory(videoRef, state, src)

watch(videoRef, dom => {
    if(dom !== undefined) {
        state.playing = !dom.paused
        state.currentTime = dom.currentTime
        state.duration = dom.duration
        dom.volume = state.volume
        dom.muted = state.muted
    }
})

useInterceptedKey(props.immersive ? ["Space", "ArrowLeft", "ArrowRight"] : ["Meta+ArrowLeft", "Meta+ArrowRight"], e => {
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
@use "@/styles/base/color"

.view
    position: relative
    width: 100%
    height: 100%
    background-color: color.$black
    
    > video
        width: 100%
        height: 100%
</style>
