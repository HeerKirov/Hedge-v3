<script setup lang="ts">
import { Icon } from "@/components/universal"

defineProps<{
    icon?: string
    num?: number | null
    fixed?: "right-top"
}>()

</script>

<template>
    <div :class="{[$style.badge]: true, [$style['fixed-right-top']]: fixed === 'right-top'}">
        <Icon class="mr-half" :icon="icon ?? 'images'"/>{{num}}
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/color"
@use "@/styles/base/size"

.badge
    padding: 0.125rem 0.35rem
    border-radius: size.$radius-size-std
    color: color.$dark-mode-text-color
    background-color: rgba(0, 0, 0, 0.65)
    &.fixed-right-top
        position: absolute
        right: 0.25rem
        top: 0.25rem
</style>