<script setup lang="ts">
import { computed, useCssModule } from "vue"
import { Icon } from "@/components/universal"

const props = defineProps<{
    icon: string
    label: string
    badge: number | null
    checked?: "selected" | "sub-selected" | null
    disabled?: boolean
    hasSub?: boolean
    subOpen?: boolean
}>()

const emit = defineEmits<{
    (e: "click"): void
    (e: "update:subOpen", value: boolean): void
}>()

const clickCaret = (e: MouseEvent) => {
    emit("update:subOpen", !props.subOpen)
    e.stopPropagation()
}

const style = useCssModule()

const divClass = computed(() => [
    style.button,
    props.checked === "selected" ? style.selected : props.checked === "sub-selected" ? style.subSelected : style.general
])

</script>

<template>
    <button :class="divClass" @click="$emit('click')">
        <Icon :icon="icon"/>
        <span class="ml-2">{{label}}</span>
        <span v-if="badge !== null && badge !== undefined" :class="$style.badge">
            {{ badge }}
        </span>
        <span v-if="hasSub" :class="$style.caret" @click="clickCaret">
            <Icon :icon="subOpen ? 'caret-down' : 'caret-right'"/>
        </span>
    </button>
</template>

<style module lang="sass">
@import "../../../styles/base/size"
@import "../../../styles/base/color"

.button
    box-sizing: border-box
    vertical-align: baseline
    white-space: nowrap
    overflow: hidden
    border-radius: $radius-size-std
    text-align: left
    margin-top: $spacing-1
    padding: 0 1em
    height: $element-height-std
    width: 100%
    font-size: $font-size-std

@media (prefers-color-scheme: light)
    .general
        background-color: rgba(#ffffff, 0)
        color: $light-mode-text-color

    .sub-selected
        background-color: rgba(#ffffff, 0)
        color: $light-mode-primary

    .general,
    .sub-selected
        &:hover:not([disabled])
            background-color: rgba(45, 50, 55, 0.09)
        &:active:not([disabled])
            background-color: rgba(45, 50, 55, 0.13)
        &[disabled]
            color: $light-mode-secondary-text-color

    .selected
        color: $light-mode-primary
        background-color: rgba($light-mode-primary, 0.15)
        &:hover:not([disabled])
            background-color: rgba($light-mode-primary, 0.2)
        &:active:not([disabled])
            background-color: rgba($light-mode-primary, 0.28)
        &[disabled]
            color: $light-mode-secondary-text-color
    
    .badge
        background-color: rgba(#000000, 0.08)

@media (prefers-color-scheme: dark)
    .general
        background-color: rgba(#000000, 0)
        color: $dark-mode-text-color

    .sub-selected
        background-color: rgba(#000000, 0)
        color: $dark-mode-primary

    .general,
    .sub-selected
        &:hover:not([disabled])
            background-color: rgba(255, 255, 255, 0.09)
        &:active:not([disabled])
            background-color: rgba(255, 255, 255, 0.13)
        &[disabled]
            color: $dark-mode-secondary-text-color

    .selected
        color: $dark-mode-primary
        background-color: rgba($dark-mode-primary, 0.15)
        &:hover:not([disabled])
            background-color: rgba($dark-mode-primary, 0.2)
        &:active:not([disabled])
            background-color: rgba($dark-mode-primary, 0.28)
        &[disabled]
            color: $dark-mode-secondary-text-color

    .badge
        background-color: rgba(#000000, 0.3)

.badge
    float: right
    padding: 2px 6px
    border-radius: $radius-size-std
    font-weight: 700

.caret
    float: right
    transform: translate(3px, 2px)
</style>
