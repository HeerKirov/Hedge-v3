<script setup lang="ts">
import { installGlobalKeyStack, useInterception } from "@/modules/keyboard"
import { StackViewInfo } from "./context"
import ImageDetailView from "./ImageView.vue"

defineProps<{
    stackViewInfo: StackViewInfo
}>()

//使用独立的事件栈
installGlobalKeyStack()

//截断按键事件继续向前传播，使按键事件只能作用在最新的视图上
useInterception()

</script>

<template>
    <div :class="$style.container">
        <ImageDetailView v-if="stackViewInfo.type === 'image'" :slice-or-path="stackViewInfo.sliceOrPath" :modified-callback="stackViewInfo.modifiedCallback"/>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/color"

.container
    position: absolute
    width: 100vw
    height: 100vh
    top: 0
    left: 0
    background-color: color.$light-mode-background-color
    @media (prefers-color-scheme: dark)
        background-color: color.$dark-mode-background-color
</style>
