<script setup lang="ts">
import { computed, ref } from "vue"
import { Icon, Tag } from "@/components/universal"
import { Colors } from "@/constants/ui"
import { ModeInButtons } from "./template"

const props = withDefaults(defineProps<{
    items: {label?: string, color?: Colors, icon?: string}[]
    modeInButtons?: ModeInButtons
    displayStyle?: "normal" | "tag" | "anno"
    disableAnyRadius?: boolean
}>(), {
    modeInButtons: "icon-and-label",
    displayStyle: "normal"
})

const square = computed(() => props.items.length === 1 && (!props.items[0].label || props.modeInButtons === "icon-only"))

const el = ref<HTMLElement>()

defineExpose({
    el
})

</script>

<template>
    <div ref="el" :class="{[$style.button]: true, [$style.square]: square, [$style.allowRadius]: !disableAnyRadius}">
        <span v-if="displayStyle === 'normal'" v-for="item in items" :class="[$style.item, `has-text-${item.color}`]">
            <Icon v-if="item.icon && (modeInButtons === 'icon-only' || modeInButtons === 'icon-and-label')" class="mr-1" :icon="item.icon"/>
            {{modeInButtons === 'label-only' || modeInButtons === 'icon-and-label' ? item.label : ''}}
        </span>
        <Tag v-else-if="displayStyle === 'tag'" v-for="item in items" :class="$style.item" :color="item.color" :icon="item.icon && (modeInButtons === 'icon-only' || modeInButtons === 'icon-and-label') ? item.icon : undefined">
            {{modeInButtons === 'label-only' || modeInButtons === 'icon-and-label' ? item.label : ''}}
        </Tag>
        <Tag v-else-if="displayStyle === 'anno'" v-for="item in items" :class="$style.item" :color="item.color" :icon="item.icon && (modeInButtons === 'icon-only' || modeInButtons === 'icon-and-label') ? item.icon : undefined" brackets="[]">
            {{modeInButtons === 'label-only' || modeInButtons === 'icon-and-label' ? item.label : ''}}
        </Tag>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/size"
@use "@/styles/base/color"

.button
    box-sizing: border-box
    vertical-align: middle
    white-space: nowrap
    font-size: size.$font-size-std
    height: size.$element-height-std
    padding: 0 0.65em
    display: flex
    flex-wrap: nowrap
    align-items: center
    justify-content: center
    &.square
        width: size.$element-height-std
        padding: 0 0
    &.allow-radius:last-child
        border-top-right-radius: size.$radius-size-std
        border-bottom-right-radius: size.$radius-size-std
    &.allow-radius:first-child
        border-top-left-radius: size.$radius-size-std
        border-bottom-left-radius: size.$radius-size-std
    @media (prefers-color-scheme: light)
        background-color: rgba(#ffffff, 0)
        color: color.$light-mode-text-color
        &:hover
            background-color: rgba(45, 50, 55, 0.09)
        &:active
            background-color: rgba(45, 50, 55, 0.13)
    @media (prefers-color-scheme: dark)
        background-color: rgba(#000000, 0)
        color: color.$dark-mode-text-color
        &:hover
            background-color: rgba(255, 255, 255, 0.09)
        &:active
            background-color: rgba(255, 255, 255, 0.13)

    > .item
        display: inline-block
        :not(:last-child)
            margin-right: 4px
</style>
