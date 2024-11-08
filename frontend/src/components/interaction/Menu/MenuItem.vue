<script setup lang="ts">
import { computed, useCssModule } from "vue"
import { Icon } from "@/components/universal"
import { MenuBadge } from "./definition"

const props = defineProps<{
    icon: string
    label: string
    badge: MenuBadge
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

const style = useCssModule()

const divClass = computed(() => [
    style.button,
    props.checked === "selected" ? style.selected : props.checked === "sub-selected" ? style.subSelected : style.general
])

</script>

<template>
    <button :class="divClass" @click="$emit('click')">
        <Icon class="flex-item no-grow-shrink" :icon="icon"/>
        <span class="ml-2 flex-item w-100">{{label}}</span>
        <span v-for="badge in badges" :class="[$style.badge, $style[badge.type]]">{{ badge.count }}</span>
        <span v-if="hasSub" :class="$style.caret" @click="clickCaret">
            <Icon :icon="subOpen ? 'caret-down' : 'caret-right'"/>
        </span>
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
    margin-top: size.$spacing-1
    padding: 0 1em
    height: size.$element-height-std
    width: 100%
    font-size: size.$font-size-std

@media (prefers-color-scheme: light)
    .general
        background-color: rgba(#ffffff, 0)
        color: color.$light-mode-text-color

    .sub-selected
        background-color: rgba(#ffffff, 0)
        color: color.$light-mode-primary

    .general,
    .sub-selected
        &:hover:not([disabled])
            background-color: rgba(45, 50, 55, 0.09)
        &:active:not([disabled])
            background-color: rgba(45, 50, 55, 0.13)
        &[disabled]
            color: color.$light-mode-secondary-text-color

    .selected
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

    .sub-selected
        background-color: rgba(#000000, 0)
        color: color.$dark-mode-primary

    .general,
    .sub-selected
        &:hover:not([disabled])
            background-color: rgba(255, 255, 255, 0.09)
        &:active:not([disabled])
            background-color: rgba(255, 255, 255, 0.13)
        &[disabled]
            color: color.$dark-mode-secondary-text-color

    .selected
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

.caret
    flex: 0 0 auto
    transform: translate(3px, 0px)
</style>
