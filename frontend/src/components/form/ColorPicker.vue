<script setup lang="ts">
import { ref } from "vue"
import { Block } from "@/components/universal"
import { UsefulColors, USEFUL_COLORS } from "@/constants/ui"
import { onOutsideClick } from "@/utils/sensors"

defineProps<{
    value?: string
}>()

const emit = defineEmits<{
    (e: "update:value", v: UsefulColors): void
}>()

const rootRef = ref<HTMLElement>()

const showPicker = ref(false)

onOutsideClick(rootRef, () => showPicker.value = false)

const click = (c: UsefulColors) => {
    emit("update:value", c)
    showPicker.value = false
}

</script>

<template>
    <div ref="rootRef" :class="$style.root">
        <div :class="[$style.button, `has-bg-${value}`]" @click="showPicker = !showPicker"/>
        <Block v-if="showPicker" :class="$style.picker">
            <div v-for="c in USEFUL_COLORS" :class="[$style.button, `has-bg-${c}`]" @click="click(c)"/>
        </Block>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/size"
@use "@/styles/base/color"

.root
    display: inline-block
    position: relative

.picker
    z-index: 1
    position: absolute
    left: #{- size.$spacing-1}
    top: calc(#{size.$element-height-std} + #{size.$spacing-1})
    padding-top: size.$spacing-1
    padding-left: size.$spacing-1
    width: calc(#{size.$element-height-std * 4} + #{size.$spacing-1 * 5} + 2px)
    > *
        display: inline-block
        margin-bottom: size.$spacing-1
        margin-right: size.$spacing-1

.button
    box-sizing: border-box
    cursor: pointer
    height: size.$element-height-std
    width: size.$element-height-std
    border-radius: size.$radius-size-round
    border: solid 1px color.$light-mode-border-color
    @media (prefers-color-scheme: dark)
        border-color: color.$dark-mode-border-color
</style>