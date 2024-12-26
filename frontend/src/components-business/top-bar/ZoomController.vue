<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { Button, Block } from "@/components/universal"
import { RangeInput } from "@/components/form"
import { useInterceptedKey } from "@/modules/keyboard"
import { onOutsideClick } from "@/utils/sensors"
import { numbers } from "@/utils/primitives"

const props = defineProps<{
    value?: number
    disabled?: boolean
}>()

const emit = defineEmits<{
    (e: "update:value", v: number): void
}>()

const ZOOM_MIN = 25, ZOOM_MAX = 400, ZOOM_STEP = 25, ZOOM_DEFAULT = 100

const divRef = ref<HTMLElement>()

const visible = ref(false)

const eyeText = computed(() => numbers.round2decimal((props.value ?? ZOOM_DEFAULT) / 100))

const can = computed(() => ({minus: props.value === undefined || props.value > ZOOM_MIN, plus: props.value === undefined || props.value < ZOOM_MAX}))

const open = () => visible.value = true
const close = () => visible.value = false
const minus = () => {
    if(can.value.minus) emit("update:value", (props.value ?? ZOOM_DEFAULT) - ZOOM_STEP)
}
const plus = () => {
    if(can.value.plus) emit("update:value", (props.value ?? ZOOM_DEFAULT) + ZOOM_STEP)
}

onOutsideClick(divRef, close)

watch(() => props.disabled, disabled => {
    if(disabled && visible.value) {
        visible.value = false
    }
})

useInterceptedKey(["Meta+Minus", "Meta+Equal", "Meta+Digit0"], e => {
    if(e.key === "Equal") {
        plus()
    }else if(e.key === "Minus") {
        minus()
    }else{
        emit("update:value", ZOOM_DEFAULT)
    }
})

</script>

<template>
    <div ref="divRef" :class="$style.root">
        <Button :class="$style['eye-button']" icon="eye" :disabled="disabled" @click="open"><b :class="$style['eye-text']">x{{eyeText}}</b></Button>
        <Block v-if="visible" :class="$style['zoom-bar']">
            <Button square size="small" icon="minus" :disabled="!can.minus" @click="minus"/>
            <RangeInput :max="ZOOM_MAX" :min="ZOOM_MIN" :step="ZOOM_STEP" :value="value" @update:value="$emit('update:value', $event)" update-on-input/>
            <Button square size="small" icon="plus" :disabled="!can.plus" @click="plus"/>
            <Button :class="$style['eye-button']" icon="eye" @click="close"><b :class="$style['eye-text']">x{{eyeText}}</b></Button>
        </Block>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/size"
@use "@/styles/base/color"

.root
    position: relative

.eye-button
    width: 4.5rem
    .eye-text
        min-width: 1.75rem
        text-align: center
        display: inline-block

.zoom-bar
    -webkit-app-region: none
    position: absolute
    top: -1px
    right: -1px
    padding-left: 0.125rem
    border-radius: size.$radius-size-large
    z-index: 1

    display: flex
    flex-wrap: nowrap
    align-items: center
    > input[type="range"]
        margin: 0 0.125rem
    > .small-button
        height: 1rem
        width: 0.7rem
        padding: 0
        margin: 0 0.125rem

</style>
