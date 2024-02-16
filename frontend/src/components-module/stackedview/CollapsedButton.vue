<script setup lang="ts">
import { Button } from "@/components/universal"
import { useMouseHover } from "@/utils/sensors"

defineProps<{
    hasDarwinBorder: boolean
}>()

defineEmits<{
    (e: "click:collapsed", value: boolean): void
}>()

const { hover, ...mouseEvents } = useMouseHover()

</script>

<template>
    <div :class="$style['hover-area']" v-bind="mouseEvents">
        <Button v-if="hover" :class="{[$style['collapse-button']]: true, [$style['darwin-border-button']]: hasDarwinBorder}" square icon="fa-down-left-and-up-right-to-center" @click="$emit('click:collapsed', false)"/>
    </div>
</template>

<style module lang="sass">
@import "../../styles/base/size"

.hover-area
    position: fixed
    top: 0
    right: 0
    width: $element-height-very-large
    height: $element-height-very-large

.collapse-button
    position: fixed
    top: $spacing-1
    right: $spacing-1
    &.darwin-border-button
        border-top-right-radius: $radius-size-very-large
</style>