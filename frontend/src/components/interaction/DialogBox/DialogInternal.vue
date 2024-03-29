<script setup lang="ts">
import { onBeforeMount } from "vue"
import {installGlobalKeyStack, useInterceptedKey} from "@/modules/keyboard"

const props = defineProps<{
    position?: "absolute" | "fixed"
    closeOnEscape?: boolean
    interceptEvent?: boolean
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const click = (e: MouseEvent) => {
    if(props.interceptEvent) {
        //拦截click事件，不让其进一步向上传播。
        //这是为了使dialog的行为基本隔绝于其他DOM响应，例如clickOutside函数等。
        //若允许响应，FormKit会与MessageBox形成一个死锁。
        e.stopPropagation()
    }
}

const stack = installGlobalKeyStack()

useInterceptedKey("Escape", () => {
    //拦截所有按键，并响应ESC按键
    if(props.closeOnEscape) {
        emit("close")
    }
}, {interceptAll: true}, stack)

onBeforeMount(() => {
    //挂载dialog时，添加一个额外的小动作，使当前正在聚焦的元素失去焦点，以避免造成“焦点在input等元素上造成快捷键失灵”的问题
    const el = document.activeElement
    if(el instanceof HTMLElement) {
        el.blur()
    }
})

</script>

<template>
    <div :class="{[$style['box-framework']]: true, [$style['absolute']]: position === 'absolute'}" @click="click">
        <slot/>
    </div>
</template>

<style module lang="sass">
.box-framework
    z-index: 90
    position: fixed
    &.absolute
        position: absolute
    left: 50%
    top: 50%
    transform: translate(-50%, -50%)
</style>
