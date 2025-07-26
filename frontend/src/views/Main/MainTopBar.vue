<script setup lang="ts">
import { useDarwinWindowed } from "@/functions/app"
import { BrowserTabBar } from "@/components-module/common"

const hasDarwinBorder = useDarwinWindowed()

</script>

<template>
    <div :class="$style['tab-bar']">
        <BrowserTabBar/>
        <div id="top-bar" :class="[{[$style['darwin-border-area']]: hasDarwinBorder}, $style['extra-area']]"/>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.tab-bar
    position: relative
    display: flex
    flex-wrap: nowrap
    height: 100%

    > .extra-area
        flex: 1 0 auto
        display: flex
        flex-wrap: nowrap
        justify-content: flex-end
        > *
            -webkit-app-region: none
        &.darwin-border-area > button:last-child
            border-top-right-radius: size.$radius-size-very-large
</style>