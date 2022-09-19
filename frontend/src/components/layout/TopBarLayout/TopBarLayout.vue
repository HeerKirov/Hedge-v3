<script setup lang="ts">
import { TopBar } from "@/components/layout"

</script>

<template>
    <div :class="$style['top-bar-layout']">
        <div :class="$style['main-content']">
            <slot/>
        </div>
        <!-- TODO TopBarLayout的expand area -->
        <TopBar>
            <slot name="top-bar"/>
        </TopBar>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/color"
@import "../../../styles/base/size"
.top-bar-layout
    position: relative
    width: 100%
    height: 100%
    background-color: $light-mode-background-color
    @media (prefers-color-scheme: dark)
        background-color: $dark-mode-background-color

    > .main-content
        position: absolute
        top: $title-bar-height
        left: 0
        right: 0
        bottom: 0
</style>
