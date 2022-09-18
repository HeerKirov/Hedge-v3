<script setup lang="ts">
import { computed, useCssModule } from "vue"

const props = defineProps<{
    label: string
    checked?: boolean
}>()

const emit = defineEmits<{
    (e: "click"): void
}>()

const style = useCssModule()

const divClass = computed(() => [
   style.button,
   props.checked ? style.checked : style.general
])

</script>

<template>
    <button :class="divClass" @click="$emit('click')">
        <span class="no-wrap overflow-hidden">{{label}}</span>
    </button>
</template>

<style module lang="sass">
@import "../../../styles/base/size"
@import "../../../styles/base/color"

.button
    box-sizing: border-box
    vertical-align: baseline
    border-radius: $radius-size-std
    text-align: left
    margin-top: $spacing-half
    padding: 0 1em
    height: 30px
    width: 100%
    font-size: $font-size-std
    > span
        margin-left: calc(1.25em + $spacing-2)

@media (prefers-color-scheme: light)
    .general
        background-color: rgba(#ffffff, 0)
        color: $light-mode-text-color
        &:hover:not([disabled])
            background-color: rgba(45, 50, 55, 0.09)
        &:active:not([disabled])
            background-color: rgba(45, 50, 55, 0.13)
        &[disabled]
            color: $light-mode-secondary-text-color

    .checked
        color: $light-mode-primary
        background-color: rgba($light-mode-primary, 0.15)
        &:hover:not([disabled])
            background-color: rgba($light-mode-primary, 0.2)
        &:active:not([disabled])
            background-color: rgba($light-mode-primary, 0.28)
        &[disabled]
            color: $light-mode-secondary-text-color

@media (prefers-color-scheme: dark)
    .general
        background-color: rgba(#000000, 0)
        color: $dark-mode-text-color
        &:hover:not([disabled])
            background-color: rgba(255, 255, 255, 0.09)
        &:active:not([disabled])
            background-color: rgba(255, 255, 255, 0.13)
        &[disabled]
            color: $dark-mode-secondary-text-color

    .checked
        color: $dark-mode-primary
        background-color: rgba($dark-mode-primary, 0.15)
        &:hover:not([disabled])
            background-color: rgba($dark-mode-primary, 0.2)
        &:active:not([disabled])
            background-color: rgba($dark-mode-primary, 0.28)
        &[disabled]
            color: $dark-mode-secondary-text-color
</style>
