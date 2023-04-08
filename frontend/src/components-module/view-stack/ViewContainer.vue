<script setup lang="ts">
import { provide } from "vue"
import { useInterception } from "@/modules/keyboard"
import { eachViewInjection } from "./context"
import { StackViewInfo } from "./definition"
import ImageDetailView from "./ImageDetailView/ImageDetailView.vue"
import CollectionDetailView from "./CollectionDetailView/CollectionDetailView.vue"
import BookDetailView from "@/components-module/view-stack/BookDetailView/BookDetailView.vue";

const props = defineProps<{
    stackViewInfo: StackViewInfo
    stackIndex: number
    hidden?: boolean
}>()

provide(eachViewInjection, {stackIndex: props.stackIndex})

//截断按键事件继续向前传播，使按键事件只能作用在最新的视图上
useInterception()

</script>

<template>
    <div :class="{[$style.container]: true, [$style.hidden]: hidden}">
        <ImageDetailView v-if="stackViewInfo.type === 'image'" :slice-or-path="stackViewInfo.sliceOrPath" :modified-callback="stackViewInfo.modifiedCallback"/>
        <CollectionDetailView v-else-if="stackViewInfo.type === 'collection'" :slice-or-path="stackViewInfo.sliceOrPath"/>
        <BookDetailView v-else-if="stackViewInfo.type === 'book'" :slice-or-path="stackViewInfo.sliceOrPath"/>
    </div>
</template>

<style module lang="sass">
@import "../../styles/base/color"

.container
    position: absolute
    width: 100vw
    height: 100vh
    top: 0
    left: 0
    background-color: $light-mode-background-color
    @media (prefers-color-scheme: dark)
        background-color: $dark-mode-background-color

    &.hidden
        visibility: hidden
        transition: visibility 0.15s
</style>
