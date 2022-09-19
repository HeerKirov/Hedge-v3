<script setup lang="ts">
import {  } from "vue"

const props = defineProps<{
    items?: {label: string, value: string}[]
    value?: string
    allowCancel?: boolean
}>()

const emit = defineEmits<{
    (e: "update:value", v: string | undefined): void
}>()

const select = (e: MouseEvent, v: string) => {
    emit("update:value", v)
    if(props.allowCancel) {
        e.stopPropagation()
    }
}

const clear = () => {
    if(props.allowCancel) {
        emit("update:value", undefined)
    }
}

</script>

<template>
    <div :class="$style.select" @click="clear">
        <div v-for="item in items" :key="item.value" :class="{[$style.item]: true, [$style.selected]: item.value === value}" @click="select($event, item.value)">
            {{item.label}}
        </div>
    </div>
</template>

<style module lang="sass">
@import "../../styles/base/color"
@import "../../styles/base/size"

.select
    box-sizing: border-box
    overflow-y: auto
    overflow-x: hidden
    border-radius: $radius-size-std
    border: solid 1px $light-mode-border-color
    @media (prefers-color-scheme: dark)
        border-color: $dark-mode-border-color

    > .item
        padding: 0.5em 0.35em
        white-space: nowrap
        overflow: hidden
        background-color: $light-mode-background-color
        color: $light-mode-text-color
        &.selected
            background-color: $light-mode-primary
            color: $light-mode-text-inverted-color
        @media (prefers-color-scheme: dark)
            background-color: $dark-mode-background-color
            color: $dark-mode-text-color
            &.selected
                background-color: $dark-mode-primary
                color: $dark-mode-text-inverted-color

</style>
