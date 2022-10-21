<script setup lang="ts">
import { computed, useCssModule } from "vue"
import { Colors } from "@/constants/ui"
import { Icon } from "@/components/universal"

const props = defineProps<{
    color?: Colors
    lineStyle?: "solid" | "double" | "dashed" | "dotted" | "none"
    clickable?: boolean
    icon?: string
    tailIcon?: string
    brackets?: "()" | "{}" | "[]" | string
}>()

const style = useCssModule()

const spanClass = computed(() => [
    style.tag,
    props.lineStyle && props.lineStyle !== "solid" ? style[`is-${props.lineStyle}`] : null,
    props.color ? style[`is-color-${props.color}`] : null
])

</script>

<template>
    <component :is="clickable ? 'a' : 'span'" :class="spanClass">
        <b v-if="brackets" class="mr-1">{{brackets.slice(0, 1)}}</b>
        <Icon v-if="icon" :icon="icon"/>
        <slot/>
        <b v-if="brackets" class="ml-1">{{brackets.slice(1)}}</b>
        <Icon v-if="tailIcon" :icon="tailIcon"/>
    </component>
</template>

<style module lang="sass">
@import "../../styles/base/size"
@import "../../styles/base/color"

.tag
    border-bottom: solid 2px
    cursor: default
    white-space: nowrap
    line-height: 1em

.is-double
    border-bottom-style: double
.is-dashed
    border-bottom-style: dashed
.is-dotted
    border-bottom-style: dotted
.is-none
    border-bottom-style: none

@media (prefers-color-scheme: light)
    .tag
        color: $light-mode-text-color
    a.tag
        &:hover
            color: rgba($light-mode-text-color, 0.75)
        &:active
            color: rgba($light-mode-text-color, 0.75)

    @each $name, $color in $light-mode-colors
        .is-color-#{$name}
            border-bottom-color: $color
            color: $color
        a.is-color-#{$name}
            &:hover
                color: rgba($color, 0.75)
            &:active
                color: rgba($color, 0.6)
@media (prefers-color-scheme: dark)
    .tag
        color: $dark-mode-text-color
    a.tag
        &:hover
            color: rgba($dark-mode-text-color, 0.75)
        &:active
            color: rgba($dark-mode-text-color, 0.75)

    @each $name, $color in $dark-mode-colors
        .is-color-#{$name}
            border-bottom-color: $color
            color: $color
        a.is-color-#{$name}
            &:hover
                color: rgba($color, 0.75)
            &:active
                color: rgba($color, 0.6)
</style>
