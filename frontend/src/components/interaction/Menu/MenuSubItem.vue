<script setup lang="ts">
import { computed } from "vue"
import { MenuBadge } from "./definition"

const props = defineProps<{
    label: string
    checked?: boolean
    badge: MenuBadge
}>()

defineEmits<{
    (e: "click"): void
}>()

const badges = computed(() => {
    if(props.badge === null || props.badge === undefined) {
        return []
    }else if(typeof props.badge === "number" || typeof props.badge === "string") {
        return [{count: props.badge, type: "std" as const}]
    }else if(props.badge instanceof Array) {
        return props.badge
    }else{
        return [props.badge]
    }
})

</script>

<template>
    <button :class="[$style.button, checked ? $style.checked : $style.general]" @click="$emit('click')">
        <span class="flex-item w-100">{{label}}</span>
        <span v-for="badge in badges" :class="[$style.badge, $style[badge.type]]">{{ badge.count }}</span>
    </button>
</template>

<style module lang="sass">
@use "@/styles/base/size"
@use "@/styles/base/color"

.button
    box-sizing: border-box
    display: flex
    align-items: center
    justify-content: stretch
    white-space: nowrap
    overflow: hidden
    border-radius: size.$radius-size-std
    text-align: left
    margin-top: size.$spacing-half
    padding: 0 0.5em 0 1em
    height: 30px
    width: 100%
    font-size: size.$font-size-std
    > span:first-child
        margin-left: calc(1.25em + #{size.$spacing-2})

@media (prefers-color-scheme: light)
    .general
        background-color: rgba(#ffffff, 0)
        color: color.$light-mode-text-color
        &:hover:not([disabled])
            background-color: rgba(45, 50, 55, 0.09)
        &:active:not([disabled])
            background-color: rgba(45, 50, 55, 0.13)
        &[disabled]
            color: color.$light-mode-secondary-text-color

    .checked
        color: color.$light-mode-primary
        background-color: rgba(color.$light-mode-primary, 0.15)
        &:hover:not([disabled])
            background-color: rgba(color.$light-mode-primary, 0.2)
        &:active:not([disabled])
            background-color: rgba(color.$light-mode-primary, 0.28)
        &[disabled]
            color: color.$light-mode-secondary-text-color
        
    .badge
        &.std
            background-color: rgba(#000000, 0.08)
        &.danger
            background-color: rgba(color.$light-mode-danger, 0.3)

@media (prefers-color-scheme: dark)
    .general
        background-color: rgba(#000000, 0)
        color: color.$dark-mode-text-color
        &:hover:not([disabled])
            background-color: rgba(255, 255, 255, 0.09)
        &:active:not([disabled])
            background-color: rgba(255, 255, 255, 0.13)
        &[disabled]
            color: color.$dark-mode-secondary-text-color

    .checked
        color: color.$dark-mode-primary
        background-color: rgba(color.$dark-mode-primary, 0.15)
        &:hover:not([disabled])
            background-color: rgba(color.$dark-mode-primary, 0.2)
        &:active:not([disabled])
            background-color: rgba(color.$dark-mode-primary, 0.28)
        &[disabled]
            color: color.$dark-mode-secondary-text-color
    
    .badge
        background-color: rgba(#000000, 0.3)
        &.danger
            color: color.$dark-mode-danger

.badge
    flex: 0 0 auto
    padding: 2px 6px
    margin-left: 2px
    border-radius: size.$radius-size-std
    font-weight: 700
</style>
