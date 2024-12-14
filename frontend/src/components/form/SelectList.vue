<script setup lang="ts" generic="T = string">

const props = defineProps<{
    items?: {label: string, value: T}[]
    value?: T
    index?: number
    allowCancel?: boolean
}>()

const emit = defineEmits<{
    (e: "update:value", v: T | undefined): void
    (e: "update:index", index: number | undefined): void
    (e: "click", v: T, index: number): void
}>()

defineSlots<{
    default(props: {key: string, index: number, value: T, label: string, selected: boolean, click: (e: MouseEvent) => void}): any
}>()

const select = (e: MouseEvent, v: T, idx: number) => {
    emit("update:value", v)
    emit("update:index", idx)
    emit("click", v, idx)
    if(props.allowCancel) {
        e.stopPropagation()
    }
}

const clear = () => {
    if(props.allowCancel) {
        emit("update:value", undefined)
        emit("update:index", undefined)
    }
}

</script>

<template>
    <div :class="$style.select" @click="clear">
        <slot v-for="(item, idx) in items"
              :key="`${item.value}`"
              :index="idx"
              :value="item.value"
              :label="item.label"
              :selected="index !== undefined ? (idx === index) : value !== undefined ? (item.value === value) : false"
              :click="(e: MouseEvent) => select(e, item.value, idx)">
            <div :class="{[$style.item]: true, [$style.selected]: index !== undefined ? (idx === index) : value !== undefined ? (item.value === value) : false}" @click="select($event, item.value, idx)">
                {{item.label}}
            </div>
        </slot>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/color"
@use "@/styles/base/size"

.select
    box-sizing: border-box
    overflow-y: auto
    overflow-x: hidden
    border-radius: size.$radius-size-std
    border: solid 1px color.$light-mode-border-color
    @media (prefers-color-scheme: dark)
        border-color: color.$dark-mode-border-color

    > .item
        padding: 0.5em 0.35em
        white-space: nowrap
        overflow: hidden
        background-color: color.$light-mode-background-color
        color: color.$light-mode-text-color
        &.selected
            background-color: color.$light-mode-primary
            color: color.$light-mode-text-inverted-color
        @media (prefers-color-scheme: dark)
            background-color: color.$dark-mode-background-color
            color: color.$dark-mode-text-color
            &.selected
                background-color: color.$dark-mode-primary
                color: color.$dark-mode-text-inverted-color

</style>
