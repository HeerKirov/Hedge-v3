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
    default(props: {index: number, value: T, label: string, selected: boolean, click: (e: MouseEvent) => void}): any
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
        <template v-if="!!$slots.default">
            <slot v-for="(item, idx) in items" 
                :key="`${item.value}`"
                :index="idx"
                :value="item.value"
                :label="item.label"
                :selected="index !== undefined ? (idx === index) : value !== undefined ? (item.value === value) : false"
                :click="(e: MouseEvent) => select(e, item.value, idx)"
            />
        </template>
        <template v-else>
            <div v-for="(item, idx) in items" 
                :key="`${item.value}`" 
                :index="idx"
                :class="{[$style.item]: true, [$style.selected]: index !== undefined ? (idx === index) : value !== undefined ? (item.value === value) : false}" 
                @click="select($event, item.value, idx)">
                {{item.label}}
            </div>
        </template>
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
