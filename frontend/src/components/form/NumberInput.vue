<script setup lang="ts">
import { Input } from "@/components/form"
import { KeyEvent, KeyPress } from "@/modules/keyboard"

const props = defineProps<{
    value?: number | null | undefined
    max?: number
    min?: number
    placeholder?: string
    size?: "small" | "std" | "large"
    width?: "one-third" | "half" | "three-quarter" | "std" | "medium" | "large" | "2x" | "3x" | "25" | "50" | "75" | "fullwidth"
    disabled?: boolean
    autoFocus?: boolean
    updateOnInput?: boolean
    focusOnKeypress?: KeyPress
}>()

const emit = defineEmits<{
    (e: "update:value", value: number): void
    (e: "keypress", event: KeyEvent): void
    (e: "enter", event: KeyEvent): void
}>()

const onUpdate = (value: string) => {
    const newValue = parseInt(value)
    if(!isNaN(newValue)) {
        if(props.max !== undefined && newValue > props.max) {
            emit("update:value", props.max)
        }else if(props.min !== undefined && newValue < props.min) {
            emit("update:value", props.min)
        }else{
            emit("update:value", newValue)
        }
    }
}

</script>

<template>
    <Input
        type="number" :value="`${value}`" @update:value="onUpdate" @keypress="$emit('keypress', $event)" @enter="$emit('enter', $event)"
        :max="max" :min="min" :placeholder="placeholder" :size="size" :width="width" :disabled="disabled"
        :auto-focus="autoFocus" :update-on-input="updateOnInput" :focus-on-keypress="focusOnKeypress"
    />
</template>
