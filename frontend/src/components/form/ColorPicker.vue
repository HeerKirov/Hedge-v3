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
@import "../../styles/base/size"
@import "../../styles/base/color"

.root
    display: inline-block
    position: relative

.picker
    z-index: 1
    position: absolute
    left: #{-$spacing-1}
    top: calc($element-height-std + $spacing-1)
    padding-top: $spacing-1
    padding-left: $spacing-1
    width: calc(#{$element-height-std * 4} + #{$spacing-1 * 5} + 2px)
    > *
        display: inline-block
        margin-bottom: $spacing-1
        margin-right: $spacing-1

.button
    box-sizing: border-box
    cursor: pointer
    height: $element-height-std
    width: $element-height-std
    border-radius: $radius-size-round
    border: solid 1px $light-mode-border-color
    @media (prefers-color-scheme: dark)
        border-color: $dark-mode-border-color
</style>