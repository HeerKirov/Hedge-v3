<script setup lang="ts">

defineProps<{
    label: string
}>()

</script>

<template>
    <div :class="$style.scope">
        <div :class="$style.separatorHeader"/>
        <span :class="$style.label">{{label}}</span>
        <div :class="$style.separator"/>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/size"
@import "../../../styles/base/color"
.scope
    display: flex
    align-items: center
    border-radius: $radius-size-std
    margin-top: $spacing-1
    padding: 0 $spacing-1
    @media (prefers-color-scheme: light)
        &:hover
            background-color: rgba(45, 50, 55, 0.09)
        &:active
            background-color: rgba(45, 50, 55, 0.13)
    @media (prefers-color-scheme: dark)
        &:hover
            background-color: rgba(255, 255, 255, 0.09)
        &:active
            background-color: rgba(255, 255, 255, 0.13)

.label
    font-size: $font-size-small
    flex: 1 0 auto
    margin: 0 $spacing-2
    color: $light-mode-secondary-text-color
    @media (prefers-color-scheme: dark)
        color: $dark-mode-secondary-text-color

.separator-header
    width: $spacing-3
    flex: 0 0 auto
    box-sizing: border-box
    display: inline-block
    border-top: solid 1px $light-mode-border-color
    @media (prefers-color-scheme: dark)
        border-top-color: $dark-mode-border-color
.separator
    width: 100%
    box-sizing: border-box
    display: inline-block
    border-top: solid 1px $light-mode-border-color
    @media (prefers-color-scheme: dark)
        border-top-color: $dark-mode-border-color
</style>
