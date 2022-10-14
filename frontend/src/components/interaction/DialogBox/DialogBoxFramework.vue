<script setup lang="ts">
import { onBeforeMount } from "vue"
import { Block } from "@/components/universal"
import { useInterceptedKey } from "@/modules/keyboard"

const props = defineProps<{
    position?: "absolute" | "fixed"
    overflow?: "hidden" | "auto"
    closeOnEscape?: boolean
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const click = (e: MouseEvent) => {
    //拦截click事件，不让其进一步向上传播。
    //这是为了使dialog的行为基本隔绝于其他DOM响应，例如clickOutside函数等。
    e.stopPropagation()
}

useInterceptedKey("Escape", () => {
    //拦截所有按键，并响应ESC按键
    if(props.closeOnEscape) {
        emit("close")
    }
}, {interceptAll: true})

onBeforeMount(() => {
    //挂载dialog时，添加一个额外的小动作，使当前正在聚焦的元素失去焦点，以避免造成“焦点在input等元素上造成快捷键失灵”的问题
    const el = document.activeElement
    if(el instanceof HTMLElement) {
        el.blur()
    }
})

</script>

<script lang="ts">
export default {
    inheritAttrs: false
}
</script>

<template>
    <div :class="{[$style['box-framework']]: true, [$style['absolute']]: position === 'absolute'}" @click="click">
        <Block :overflow="overflow" v-bind="$attrs">
            <slot/>
        </Block>
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
