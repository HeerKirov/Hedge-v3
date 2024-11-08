<script setup lang="ts">
import { ref, watch } from "vue"
import { Block } from "@/components/universal"
import { Colors } from "@/constants/ui"
import { onOutsideClick } from "@/utils/sensors"

// == Element Popup Callout 弹出浮动块组件 ==
// 为元素添加一个弹出的浮动块。
// 将触发元素放入slot#default中，并为其使用visible和click参数以添加事件、添加相关显示判定。
// 将弹出浮动块元素放入slot#popup中，元素将在弹出的浮动块中显示。
// 目前，浮动块将固定显示在当前元素的正下方，且居中显示。

const props = defineProps<{
    visible?: boolean
    popupBlockColor?: Colors
    popupBlockMode?: "std" | "transparent" | "light" | "filled" | "shadow"
}>()

const emit = defineEmits<{
    (e: "update:visible", v: boolean): void
    (e: "close"): void
}>()

const visible = ref(props.visible ?? false)

const click = () => {
    visible.value = !visible.value
    emit("update:visible", visible.value)
    if(!visible.value) emit("close")
}

watch(() => props.visible, v => visible.value = v ?? false)

const divRef = ref<HTMLElement>()

onOutsideClick(divRef, () => {
    if(visible.value) {
        visible.value = false
        emit("update:visible", false)
        emit("close")
    }
})

</script>

<template>
    <div ref="divRef" :class="$style.root">
        <slot :visible="visible" :click="click"/>
        <Block v-if="visible" :class="$style.popup" :mode="popupBlockMode" :color="popupBlockColor">
            <slot name="popup"/>
        </Block>
    </div>
</template>

<style module lang="sass">
.root
    display: inline-block
    position: relative

.popup
    z-index: 1
    position: absolute
    bottom: 0
    left: 50%
    transform: translate(-50%, 100%)
</style>
