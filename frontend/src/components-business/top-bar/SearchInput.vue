<script setup lang="ts">
import { Input } from "@/components/form"
import { Button } from "@/components/universal"
import { KeyEvent, USUAL_KEY_VALIDATORS } from "@/modules/keyboard"
import { computedMutable } from "@/utils/reactivity"

const props = defineProps<{
    value?: string | null | undefined
    placeholder?: string
    enableDropButton?: boolean
    activeDropButton?: boolean
}>()

const emit = defineEmits<{
    (e: "update:value", value: string): void
    (e: "update:activeDropButton", value: boolean): void
    (e: "enter", newValue: boolean): void
}>()

const textValue = computedMutable(() => props.value)

const toggleDropButton = () => emit("update:activeDropButton", !props.activeDropButton)

const keypress = (e: KeyEvent) => {
    if(USUAL_KEY_VALIDATORS["Enter"](e)) {
        const newValue = textValue.value ?? ""
        emit("update:value", newValue)
        emit("enter", newValue !== props.value)
    }
}

</script>

<template>
    <div :class="$style.root">
        <Input
            :class="{[$style.input]: true, [$style.active]: activeDropButton}"
            :placeholder="placeholder"
            v-model:value="textValue"
            focus-on-keypress="Meta+KeyF"
            @keypress="keypress"
            update-on-input
        />
        <Button 
            v-if="enableDropButton" 
            :class="$style.button" 
            :icon="activeDropButton ? 'caret-up' : 'caret-down'" size="small" square
            @click="toggleDropButton"
        />
    </div>
</template>

<style module lang="sass">
@import "../../styles/base/size"
@import "../../styles/base/color"

.root
    width: 75%
    position: relative
    border-bottom: solid 1px $light-mode-border-color
    @media (prefers-color-scheme: dark)
        border-bottom-color: $dark-mode-border-color

.input
    border: none
    width: 100%
    &:focus,
    &.active
        background-color: mix($light-mode-block-color, #000000, 90)
        @media (prefers-color-scheme: dark)
            background-color: mix($dark-mode-block-color, #000000, 65)

.button
    $gap: #{calc(($element-height-std - $element-height-small) / 2)}
    position: absolute
    right: $gap
    top: $gap

</style>
