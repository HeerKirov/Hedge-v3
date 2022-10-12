<script setup lang="ts">
import { Input } from "@/components/form"
import { KeyEvent, KeyPress } from "@/modules/keyboard"

const props = defineProps<{
    value?: number | null | undefined
    max?: number
    min?: number
    placeholder?: string
    size?: "small" | "std" | "large"
    disabled?: boolean
    autoFocus?: boolean
    updateOnInput?: boolean
    focusOnKeypress?: KeyPress
}>()

const emit = defineEmits<{
    (e: "update:value", value: number): void
    (e: "keypress", event: KeyEvent): void
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
        type="number" :value="`${value}`" @update:value="onUpdate" @keypress="$emit('keypress', $event)"
        :max="max" :min="min" :placeholder="placeholder" :size="size" :disabled="disabled"
        :auto-focus="autoFocus" :update-on-input="updateOnInput" :focus-on-keypress="focusOnKeypress"
    />
</template>
