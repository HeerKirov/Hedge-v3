<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, computed, nextTick } from "vue"
import { Icon, Block } from "@/components/universal"
import { ToastType } from "@/modules/toast"
import { useMouseHover } from "@/utils/sensors"
import { sleep } from "@/utils/process"

defineProps<{
    title: string
    type: ToastType
    content?: string
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const { hover: mouseHover, ...hoverEvents } = useMouseHover()

const offsetX = ref<number | null>(null)

const lock = ref(false)

const hover = computed(() => lock.value || mouseHover.value || offsetX.value !== null)

const offsetStyle = computed(() => offsetX.value !== null ? {"transform": `translateX(${offsetX.value}px)`} : undefined)

const slideToClose = ref(false)

const close = () => {
    if(timeout !== null) clearTimeout(timeout)
    emit("close")
}

//记录计时器。使用计时器机制完成自动关闭，并结合动画系统实现进度条
let timeout: NodeJS.Timeout | null = null
//两个flag。拆分为两个，并有间隔地依次激活，来确保width - transition的生效顺序
const timeoutFlag = ref(false)
const transitionFlag = ref(false)

//初始计时器
onMounted(async () => {
    timeout = setTimeout(close, 3000)
    transitionFlag.value = true
    await sleep(50)
    timeoutFlag.value = true
})

//hover表示任何阻止Toast计时的状态，包括：鼠标hover，正在抓住拖曳，锁定状态
watch(hover, async hover => {
    if(hover) {
        if(timeout !== null) {
            clearTimeout(timeout)
            timeout = null
            timeoutFlag.value = false
            transitionFlag.value = false
        }
    }else{
        if(timeout !== null) clearTimeout(timeout)
        timeout = setTimeout(close, 3000)
        transitionFlag.value = true
        timeoutFlag.value = true
    }
})

//记录mousedown时的鼠标坐标
let mousedownPageX: number | null = null
//记录第一个mousemove时的时刻
let mouseStartMoveTime: DOMHighResTimeStamp | null = null

const dragAreaMouseDown = (e: MouseEvent) => {
    mousedownPageX = e.pageX
    offsetX.value = 0
    document.addEventListener("mousemove", mouseMove)
    document.addEventListener("mouseup", mouseUp)
}

const mouseMove = (e: MouseEvent) => {
    if(mousedownPageX !== null) {
        const offset = e.pageX - mousedownPageX
        offsetX.value = offset > -50 ? offset : -50
    }
    if(mouseStartMoveTime === null) {
        mouseStartMoveTime = e.timeStamp
    }
}

const mouseUp = (e: MouseEvent) => {
    if(mousedownPageX !== null) {
        if(mousedownPageX - e.pageX > 50) {
            //向左拖动50px，就会锁定这条通知
            lock.value = !lock.value
            offsetX.value = null
        }else if((e.pageX - mousedownPageX > 50 && window.innerWidth - e.pageX < 16) || (mouseStartMoveTime !== null && e.pageX - mousedownPageX > 75 && (e.pageX - mousedownPageX) / (e.timeStamp - mouseStartMoveTime) >= 1.2)) {
            //向右拖动至少50px，且鼠标终点距离屏幕边缘小于16px
            //或者向右拖动至少75px，且px/ms的速度高于1.2
            //就会清除这条通知
            slideToClose.value = true
            //关闭要等下一个tick，需要等slide-to-close成功应用到DOM上
            //slide-to-close标记会告诉transition-group此组件关闭时使用横向滑动的动画。同时，没有被清除的offsetX会成为动画的初始帧
            nextTick(close)
        }else{
            offsetX.value = null
        }
    }else{
        offsetX.value = null
    }
    mousedownPageX = null
    mouseStartMoveTime = null
    document.removeEventListener("mousemove", mouseMove)
    document.removeEventListener("mouseup", mouseUp)
}

onUnmounted(() => {
    document.removeEventListener("mousemove", mouseMove)
    document.removeEventListener("mouseup", mouseUp)
})

</script>

<template>
    <Block :class="{[$style['item']]: true, [$style[`is-color-${type}`]]: type && type !== 'plain', 'slide-to-close': slideToClose}" :style="offsetStyle" v-bind="hoverEvents" @mousedown="dragAreaMouseDown">
        <div :class="$style['title-div']">
            <b :class="$style['title']"><Icon v-if="lock" class="mr-1" icon="lock"/>{{title}}</b>
            <a :class="{[$style['close-button']]: true, [$style['show']]: hover}" @click="close">
                <Icon icon="close"/>
            </a>
        </div>
        <p v-if="!!content" :class="$style['content']">{{content}}</p>
        <div :class="{[$style['bar']]: true, [$style['timeout']]: timeoutFlag, [$style['timeout-transition']]: transitionFlag}"/>
    </Block>
</template>

<style module lang="sass">
@use "@/styles/base/size"
@use "@/styles/base/color"

.item
    margin-bottom: size.$spacing-2
    padding: size.$spacing-2 size.$spacing-1 size.$spacing-3 size.$spacing-3
    width: fit-content
    min-width: 8rem
    max-width: 35rem
    position: relative
    pointer-events: auto

    > .title-div
        > .close-button
            float: right
            visibility: hidden
            &.show
                visibility: visible
    > .content
        padding: size.$spacing-1 0 0 0
    > .bar
        position: absolute
        bottom: 0
        left: 0
        width: 100%
        height: size.$spacing-half
        background-color: color.$light-mode-primary
        @media (prefers-color-scheme: dark)
            background-color: color.$dark-mode-primary
        &.timeout
            width: 0
        &.timeout-transition
            transition: width 3s linear

    @media (prefers-color-scheme: light)
        @each $name, $color in color.$light-mode-theme-colors
            &.is-color-#{$name}
                > .title-div > .title
                    color: $color
                > .bar
                    background-color: $color

    @media (prefers-color-scheme: dark)
        @each $name, $color in color.$dark-mode-theme-colors
            &.is-color-#{$name}
                > .title-div > .title
                    color: $color
                > .bar
                    background-color: $color
</style>
