<script setup lang="ts">
import { computed, useCssModule } from "vue"
import { useAssets } from "@/functions/app"
import { OrganizationSituationImage } from "./context"

const { assetsUrl } = useAssets()

const props = defineProps<{
    item: OrganizationSituationImage
}>()

const style = useCssModule()

const imgClass = computed(() => [
    style.img,
    props.item.groupFirst ? style.first : null,
    props.item.groupLast ? style.last : null,
    props.item.groupColor !== null ? style.group : null,
    props.item.groupColor !== null ? style[`is-${props.item.groupColor}`] : null,
])

</script>

<template>
    <img :class="imgClass" :src="assetsUrl(item.filePath.sample)" :alt="item.filePath.sample ?? 'null'"/>
</template>

<style module lang="sass">
@use "@/styles/base/color"

.img
    border-style: solid
    border-width: 5px
    box-sizing: border-box
    
    &.group:not(.first)
        border-left-width: 0
    &.group:not(.last)
        border-right-width: 0
    &:not(.group)
        border-left-width: 4px
        border-right-width: 4px

    @media (prefers-color-scheme: light)
        border-color: color.$light-mode-block-color
        @each $name, $color in color.$light-mode-colors
            &.is-#{$name}
                border-top-color: $color
                border-bottom-color: $color
                &.first
                    border-left-color: $color
                &.last
                    border-right-color: $color

    @media (prefers-color-scheme: dark)
        border-color: color.$dark-mode-block-color
        @each $name, $color in color.$dark-mode-colors
            &.is-#{$name}
                border-top-color: $color
                border-bottom-color: $color
                &.first
                    border-left-color: $color
                &.last
                    border-right-color: $color

</style>