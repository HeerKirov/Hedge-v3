<script setup lang="ts">
import { computed, useCssModule } from "vue"
import { Colors } from "@/constants/ui"
import { Icon } from "@/components/universal"

const props = defineProps<{
    color?: Colors
    lineStyle?: "solid" | "double" | "dashed" | "dotted"
    clickable?: boolean
    icon?: string
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
        <Icon v-if="icon" :icon="icon"/>
        <slot/>
    </component>
</template>

<style module lang="sass">
@import "../../styles/base/size"
@import "../../styles/base/color"

.tag
    border-bottom: solid 2px
    cursor: default
.is-double
    border-bottom-style: double
.is-dashed
    border-bottom-style: dashed
.is-dotted
    border-bottom-style: dotted

@media (prefers-color-scheme: light)
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
