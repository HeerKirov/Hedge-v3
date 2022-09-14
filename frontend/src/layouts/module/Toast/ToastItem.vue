<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue"
import { Icon, Block } from "@/components/universal"
import { ToastType } from "@/services/module/toast"
import { useMouseHover } from "@/utils/sensors"
import { sleep } from "@/utils/process";

defineProps<{
    title: string
    type: ToastType
    content?: string
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const { hover, ...hoverEvents } = useMouseHover()

const close = () => {
    if(timeout !== null) clearTimeout(timeout)
    emit("close")
}

//记录计时器。使用计时器机制完成自动关闭，并结合动画系统实现进度条
let timeout: NodeJS.Timeout | null = null
//两个flag。拆分为两个，并有间隔地依次激活，来确保width - transition的生效顺序
const timeoutFlag = ref(false)
const transitionFlag = ref(false)

onMounted(async () => {
    timeout = setTimeout(close, 3000)
    transitionFlag.value = true
    await sleep(50)
    timeoutFlag.value = true
})

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

</script>

<template>
    <Block :class="{[$style['item']]: true, [$style[`is-color-${type}`]]: type && type !== 'plain'}" mode="shadow" v-bind="hoverEvents">
        <div :class="$style['title-div']">
            <b :class="$style['title']">{{title}}</b>
            <a :class="{[$style['close-button']]: true, [$style['show']]: hover}" @click="$emit('close')">
                <Icon icon="close"/>
            </a>
        </div>
        <p v-if="!!content" :class="$style['content']">{{content}}</p>
        <div :class="{[$style['bar']]: true, [$style['timeout']]: timeoutFlag, [$style['timeout-transition']]: transitionFlag}"/>
    </Block>
</template>

<style module lang="sass">
@import "../../../styles/base/size"
@import "../../../styles/base/color"

.item
    margin-bottom: $spacing-2
    padding: $spacing-2 $spacing-1 $spacing-3 $spacing-3
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
        padding: $spacing-1 0 0 0
    > .bar
        position: absolute
        bottom: 0
        left: 0
        width: 100%
        height: $spacing-half
        background-color: $light-mode-primary
        @media (prefers-color-scheme: dark)
            background-color: $dark-mode-primary
        &.timeout
            width: 0
        &.timeout-transition
            transition: width 3s linear

    @media (prefers-color-scheme: light)
        @each $name, $color in $light-mode-theme-colors
            &.is-color-#{$name}
                > .title-div > .title
                    color: $color
                > .bar
                    background-color: $color

    @media (prefers-color-scheme: dark)
        @each $name, $color in $dark-mode-theme-colors
            &.is-color-#{$name}
                > .title-div > .title
                    color: $color
                > .bar
                    background-color: $color
</style>
