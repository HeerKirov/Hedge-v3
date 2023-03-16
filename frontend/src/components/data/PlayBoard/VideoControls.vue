<script setup lang="ts">
import { toRef } from "vue"
import { Icon } from "@/components/universal"
import { useMouseHover } from "@/utils/sensors"
import { useProgressBar, useProgressSpan, useVolumeController } from "./video"

const props = defineProps<{
    playing: boolean
    volume: number
    muted: boolean
    currentTime: number
    duration: number
}>()

const emit = defineEmits<{
    (e: "play-or-pause"): void
    (e: "seek", positionTime: number): void
    (e: "update:volume", v: number): void
    (e: "update:muted", v: boolean): void
}>()

const currentTime = toRef(props, "currentTime")
const duration = toRef(props, "duration")
const volume = toRef(props, "volume")

const playOrPause = () => emit("play-or-pause")
const seek = (positionTime: number) => emit("seek", positionTime)
const updateVolume = (volume: number) => emit("update:volume", volume)

const { hover, ...hoverEvents } = useMouseHover()

const { progressPercent, progressBarStyle, progressClick } = useProgressBar(currentTime, duration, seek)

const { currentTimeText, maxTimeText } = useProgressSpan(currentTime, duration)

const { volumeHover, volumeHoverEvents, volumeBarStyle, mousemove, mousedown } = useVolumeController(volume, updateVolume)

</script>

<template>
    <div :class="{[$style.controls]: true, [$style.visible]: hover}" v-bind="hoverEvents">
        <template v-if="hover">
            <div :class="$style['progress-bar']" @mousedown="progressClick">
                <div v-if="progressPercent !== null" :class="$style.progressing" :style="progressBarStyle"/>
                <div :class="$style['hidden-trigger-area']"/>
            </div>
            <div :class="$style['progress-span']">
                {{currentTimeText}} / {{maxTimeText}}
            </div>
            <div :class="{[$style['volume-control']]: true, [$style.visible]: volumeHover}" v-bind="volumeHoverEvents">
                <template v-if="volumeHover">
                    <div :class="$style.num">{{Math.round(volume * 100)}}</div>
                    <div :class="$style['volume-bar']" @mousedown="mousedown" @mousemove="mousemove">
                        <div :class="$style['progressing']" :style="volumeBarStyle"/>
                        <div :class="$style['hidden-trigger-area']"/>
                    </div>
                </template>
                <div :class="$style.icon" @click="$emit('update:muted', !muted)"><Icon :icon="muted ? 'volume-mute' : volume >= 0.5 ? 'volume-up' : volume > 0 ? 'volume-down' : 'volume-off'"/></div>
            </div>
            <div :class="$style['play-button']" @click="playOrPause"><Icon :icon="playing ? 'pause' : 'play'"/></div>
        </template>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/color"
@import "../../../styles/base/size"

.controls
    position: absolute
    bottom: 0
    left: 0
    width: 100%
    height: 8rem
    &.visible
        background: linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.9))

.progress-bar
    position: absolute
    left: 1rem
    right: 1rem
    bottom: 0.5rem
    height: 0.25rem
    background-color: rgba(64, 64, 64, 0.5)
    > .hidden-trigger-area
        position: absolute
        left: 0
        bottom: -0.125rem
        width: 100%
        height: 0.5rem
    > .progressing
        height: 100%
        background-color: $blue

.progress-span
    position: absolute
    right: 1.5rem
    bottom: 2.25rem
    text-align: right
    color: $white

.play-button
    position: absolute
    left: 1.5rem
    bottom: 1.5rem
    width: 2.5rem
    height: 2.5rem
    padding-left: 2px
    padding-top: 1px
    line-height: 2.5rem
    text-align: center
    font-size: $font-size-large
    color: $white
    border-radius: $radius-size-round
    &:hover
        background-color: rgba(128, 128, 128, 0.5)

.volume-control
    position: absolute
    right: 8rem
    bottom: 1.75rem
    height: 2rem
    width: 2rem
    line-height: 2rem
    color: $white
    border-radius: $radius-size-round
    display: flex
    flex-wrap: nowrap
    justify-content: flex-end
    transition: all 0.25s
    &.visible
        width: 10rem
        background-color: rgba(48, 48, 48, 0.7)
    > .num
        width: 2.5rem
        text-align: center
        flex: 0 0 auto
    > .volume-bar
        position: relative
        width: 100%
        height: 0.5rem
        margin-top: 0.75rem
        margin-right: 0.25rem
        background-color: rgba(16, 16, 16, 0.5)
        border-radius: $radius-size-round
        > .hidden-trigger-area
            position: absolute
            left: 0
            top: -0.625rem
            width: 100%
            height: 1.5rem
        > .progressing
            height: 100%
            border-radius: $radius-size-round
            background-color: $light-mode-block-color
    > .icon
        width: 2rem
        text-align: center
        flex: 0 0 auto
        transform: translateX(-1px)
</style>
