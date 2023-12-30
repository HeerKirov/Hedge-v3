<script setup lang="ts">
import { ref } from "vue"
import { Input } from "@/components/form"
import { Button } from "@/components/universal"
import { createKeyEventValidator, KeyEvent, useInterceptedKey, USUAL_KEY_VALIDATORS } from "@/modules/keyboard"
import { computedMutable } from "@/utils/reactivity"

const props = defineProps<{
    value?: string
    placeholder?: string
    enableDropButton?: boolean
    activeDropButton?: boolean
}>()

const emit = defineEmits<{
    (e: "update:value", search: string): void
    (e: "update:activeDropButton", value: boolean): void
    (e: "enter", newValue: boolean): void
}>()

const textValue = computedMutable(() => props.value)

const active = ref(false)

const toggleDropButton = () => emit("update:activeDropButton", !props.activeDropButton)

const META_E_VALIDATOR = createKeyEventValidator("Meta+KeyE")

const keypress = (e: KeyEvent) => {
    if(USUAL_KEY_VALIDATORS["Enter"](e)) {
        const newValue = textValue.value ?? ""
        emit("update:value", newValue)
        emit("enter", newValue !== props.value)
    }else if(props.enableDropButton && META_E_VALIDATOR(e)) {
        emit("update:activeDropButton", !props.activeDropButton)
    }
}

const focus = () => active.value = true

const blur = () => active.value = false

const clear = () => {
    if(props.value !== "") {
        emit("update:value", "")
        emit("enter", true)
    }
}

useInterceptedKey("Meta+KeyE", () => {
    if(props.enableDropButton) {
        emit("update:activeDropButton", !props.activeDropButton)
    }
})

</script>

<template>
    <div :class="{[$style['search-box']]: true, [$style['has-value']]: !!value}">
        <Input
            :class="{[$style.input]: true, [$style.active]: active, [$style.focus]: activeDropButton, [$style['has-text']]: enableDropButton}"
            :placeholder="placeholder" v-model:value="textValue" update-on-input
            focus-on-keypress="Meta+KeyF" blur-on-keypress="Escape"
            @keypress="keypress" @focus="focus" @blur="blur"
        />
        <Button
            v-if="enableDropButton"
            :class="$style['clear-button']"
            icon="close" size="tiny" square
            @click="clear"
        />
        <Button
            v-if="enableDropButton"
            :class="$style['dropdown-button']"
            :icon="activeDropButton ? 'caret-up' : 'caret-down'" size="tiny" square
            @click="toggleDropButton"
        />
    </div>
</template>

<style module lang="sass">
@import "../../styles/base/size"
@import "../../styles/base/color"

$collapse-width: 140px
$expand-width: 240px

.search-box
    position: relative
    transition: width 0.1s ease-in-out

    &:not(.has-value)
        width: $collapse-width
        .input:not(.active)
            width: $collapse-width
        .input.active
            width: $expand-width
    &.has-value
        width: $expand-width
        .input
            width: $expand-width

    .input
        -webkit-app-region: none
        position: absolute
        border-radius: $radius-size-large
        transition: width 0.1s ease-in-out
        right: 0
        &:focus,
        &.focus
            background-color: mix($light-mode-block-color, #000000, 96%)
            @media (prefers-color-scheme: dark)
                background-color: mix($dark-mode-block-color, #000000, 65%)
        &.has-text
            padding-right: #{calc($element-height-std - ($element-height-std - $element-height-tiny) / 2)}

    .clear-button
        position: absolute
        font-size: $font-size-small
        right: #{calc(($element-height-std - $element-height-tiny) / 2 + 1px)}
        top: #{($element-height-std - $element-height-tiny) / 2}
        > svg
            transform: translateY(1px)

    .dropdown-button
        position: absolute
        $gap: #{calc(($element-height-std - $element-height-small) / 2 + 1px)}
        right: $gap
        top: $gap
</style>