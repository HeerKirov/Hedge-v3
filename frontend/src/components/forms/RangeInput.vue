<script setup lang="ts">
import { ref, watch } from "vue"
import { useKeyDeclaration } from "@/services/module/keyboard"

const props = defineProps<{
    value?: number | null | undefined
    max?: number
    min?: number
    step?: number
    disabled?: boolean
    updateOnInput?: boolean
}>()

const emit = defineEmits<{
    (e: 'update:value', value: number): void
}>()

watch(() => props.value, () => { value.value = props.value ?? undefined })

const value = ref(props.value ?? undefined)

const onUpdate = (e: InputEvent) => {
    const newValue = parseInt((e.target as HTMLInputElement).value)
    if(!isNaN(newValue)) {
        value.value = newValue
        emit('update:value', value.value)
    }
}

//按键事件处理
const keyDeclaration = useKeyDeclaration()

const onKeydown = (e: KeyboardEvent) => {
    if(!keyDeclaration.primitiveValidator(e)) {
        e.stopPropagation()
        e.stopImmediatePropagation()
    }
}

const events = {[props.updateOnInput ? "onInput" : "onChange"]: onUpdate, onKeydown}

</script>

<template>
    <input type="range" class="range" :max="max" :min="min" :step="step" :disabled="disabled" :value="value" v-bind="events"/>
</template>

<style scoped lang="sass">
@import "../../styles/base/size"
@import "../../styles/base/color"

input[type="range"].range
    $height: 8px
    $margin: ($element-height-std - $height) / 2
    -webkit-appearance: none
    margin: $margin 0.25rem
    height: $height
    box-sizing: border-box
    border-radius: $radius-size-round
    border: solid 1px $light-mode-border-color
    background-color: mix($light-mode-block-color, #000000, 98)
    @media (prefers-color-scheme: dark)
        border-color: $dark-mode-border-color
        background-color: mix($dark-mode-block-color, #ffffff, 98)

    &::-webkit-slider-thumb
        $size: 0.75rem
        $hover-scale: 0.15
        -webkit-appearance: none
        border-radius: $radius-size-round
        width: $size
        height: $size
        transition: transform 0.15s
        &:hover
            transform: scale(#{1 + $hover-scale})
        background-color: $light-mode-primary
        &:active
            background-color: mix($light-mode-primary, #000000, 10)
        @media (prefers-color-scheme: dark)
            background-color: $dark-mode-primary
            &:active
                background-color: mix($dark-mode-primary, #000000, 10)
</style>
