import { computed, onBeforeMount, onBeforeUnmount, onUnmounted, Ref, watch } from "vue"
import { createMemoryStorage, useLocalStorage } from "@/functions/app"
import { numbers } from "@/utils/primitives"
import { sleep } from "@/utils/process"
import { useMouseHover } from "@/utils/sensors"

export function usePlayControl(videoRef: Ref<HTMLMediaElement | undefined>, state: State) {
    const playOrPause = () => {
        if(videoRef.value !== undefined) {
            if(videoRef.value.paused) {
                videoRef.value.play()
            }else{
                videoRef.value.pause()
            }
        }
    }

    const fastForward = () => {
        if(!isNaN(state.duration) && state.duration !== Infinity) {
            videoRef.value!.currentTime = Math.min(state.currentTime + 3, state.duration)
        }
    }

    const fastRewind = () => {
        if(!isNaN(state.duration) && state.duration !== Infinity) {
            videoRef.value!.currentTime = Math.max(state.currentTime - 3, 0)
        }
    }

    const seek = (time: number) => {
        if(!isNaN(state.duration) && state.duration !== Infinity) {
            videoRef.value!.currentTime = time < 0 ? 0 : time > state.duration ? state.duration : time
        }
    }

    const pausedEvent = () => {
        state.playing = false
    }

    const playingEvent = () => {
        state.playing = true
    }

    const timeUpdateEvent = () => {
        state.currentTime = videoRef.value?.currentTime ?? NaN
    }

    const durationChangeEvent = () => {
        state.duration = videoRef.value!.duration
    }

    return {playOrPause, fastForward, fastRewind, seek, pausedEvent, playingEvent, timeUpdateEvent, durationChangeEvent}
}

export function useVolumeControl(videoRef: Ref<HTMLMediaElement | undefined>, state: State) {
    const storage = useLocalStorage("play-board/video/volume", {volume: 1, muted: false})

    const updateVolume = (volume: number) => {
        state.volume = numbers.between(0, volume, 1)
    }

    const updateMuted = (muted: boolean) => {
        state.muted = muted
    }

    onBeforeMount(() => {
        state.volume = storage.value.volume
        state.muted = storage.value.muted
    })

    watch(() => state.volume, volume => {
        if(videoRef.value !== undefined) {
            videoRef.value.volume = volume
        }
    })

    watch(() => state.muted, muted => {
        if(videoRef.value !== undefined) {
            videoRef.value.muted = muted
        }
    })

    watch(() => ({volume: state.volume, muted: state.muted}), async (newStorage, old, onInvalidate) => {
        if(newStorage.volume !== old.volume || newStorage.muted !== old.muted) {
            //对volume状态的保存行为节流，延缓保存以减少执行次数
            let validate = true
            onInvalidate(() => validate = false)
            await sleep(1000)
            if(validate) {
                storage.value = newStorage
            }
        }
    })

    return {updateVolume, updateMuted}
}

export function useProgressBar(current: Ref<number>, max: Ref<number>, seek: (v: number) => void) {
    const progressPercent = computed(() => !isNaN(max.value) && max.value !== Infinity ? (current.value * 100 / max.value).toFixed(3) : null)

    const progressBarStyle = computed(() => ({width: `${progressPercent.value}%`}))

    const progressClick = (e: MouseEvent) => {
        if(!isNaN(max.value) && max.value !== Infinity) {
            const seekValue = max.value * e.offsetX / (e.target as HTMLElement).offsetWidth
            seek(seekValue)
        }
    }

    return {progressPercent, progressBarStyle, progressClick}
}

export function useProgressSpan(current: Ref<number>, max: Ref<number>) {
    function toMinAndSec(value: number): string {
        const ten = (v: number) => v >= 10 ? v : `0${v}`
        const sec = Math.floor(value % 60), min = Math.floor(value / 60)
        return `${ten(min)}:${ten(sec)}`
    }

    const currentTimeText = computed(() => toMinAndSec(current.value))
    const maxTimeText = computed(() => toMinAndSec(max.value))

    return {currentTimeText, maxTimeText}
}

export function useVolumeController(volume: Ref<number>, updateVolume: (v: number) => void) {
    const { hover: volumeHover, ...volumeHoverEvents } = useMouseHover()

    const volumeBarStyle = computed(() => ({width: `${(volume.value * 100).toFixed(3)}%`}))

    let isMousedown = false

    const updateValue = (e: MouseEvent) => {
        const seekValue = numbers.round2decimal(e.offsetX / (e.target as HTMLElement).offsetWidth)
        updateVolume(seekValue >= 0.97 ? 1 : seekValue <= 0.03 ? 0 : seekValue)
    }

    const mousedown = (e: MouseEvent) => {
        updateValue(e)
        document.addEventListener('mouseup', mouseup)
        isMousedown = true
    }

    const mousemove = (e: MouseEvent) => {
        if(isMousedown) {
            updateValue(e)
        }
    }

    const mouseup = () => {
        isMousedown = false
        document.removeEventListener('mouseup', mouseup)
    }

    onUnmounted(() => {
        document.removeEventListener('mouseup', mouseup)
    })

    return {volumeHover, volumeHoverEvents, volumeBarStyle, mousedown, mousemove}
}

export interface State {
    playing: boolean
    volume: number
    muted: boolean
    currentTime: number
    duration: number
}

export function useVideoPositionMemory(videoRef: Ref<HTMLMediaElement | undefined>, state: State, src: Ref<string | undefined>) {
    const videoPositions = createMemoryStorage<Record<string, number>>("play-board/video/positions", () => ({}), true)

    // 保存当前视频的播放位置
    const saveCurrentPosition = (videoSrc: string | undefined) => {
        if(videoSrc && !isNaN(state.currentTime) && state.currentTime > 0) {
            const positions = videoPositions.get()
            videoPositions.set({...positions, [videoSrc]: state.currentTime})
        }
    }

    // 当src改变时，保存旧视频的位置并重置duration
    watch(src, (newSrc, oldSrc) => {
        if(oldSrc && oldSrc !== newSrc) {
            saveCurrentPosition(oldSrc)
            // 重置duration，以便新视频加载后触发恢复逻辑
            state.duration = NaN
        }
    })

    // 恢复上次播放位置
    watch(() => state.duration, (duration, oldDuration) => {
        if(!isNaN(duration) && duration !== Infinity && isNaN(oldDuration) && src.value && videoRef.value) {
            const positions = videoPositions.get()
            const savedPosition = positions[src.value]
            if(savedPosition !== undefined && savedPosition > 0 && savedPosition < duration) {
                videoRef.value.currentTime = savedPosition
            }
        }
    })

    // 组件卸载时保存播放位置
    onBeforeUnmount(() => {
        if(src.value) {
            saveCurrentPosition(src.value)
        }
    })
}

