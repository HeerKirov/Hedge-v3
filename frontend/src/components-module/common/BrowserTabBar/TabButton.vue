<script setup lang="ts">
import { toRef } from "vue"
import { Block, Button } from "@/components/universal"
import { Tab } from "@/modules/browser"
import { useDraggingTab } from "./context"

const props = defineProps<{
    tab: Tab
}>()

const emit = defineEmits<{
    (e: "active", tabIndex: number): void
    (e: "close", tab: Tab): void
    (e: "contextmenu", tab: Tab): void
}>()

const { dragEnter, dragLeave, dragOver, dragStart, dragEnd } = useDraggingTab(toRef(props, "tab"))

const mouseUp = (e: MouseEvent) => {
    if(e.button === 1) {
        emit("close", props.tab)
    }
}

</script>

<template>
    <Block :class="[{[$style.active]: tab.active}, $style.tab, 'no-app-region']"
           draggable="true" @dragstart="dragStart" @dragend="dragEnd"
           @dragenter="dragEnter" @dragleave="dragLeave" @dragover="dragOver"
           @click="$emit('active', tab.index)" @mouseup="mouseUp" @contextmenu="$emit('contextmenu', tab)">
        <span class="no-wrap overflow-ellipsis">{{ tab.title ?? "无标题" }}</span>
        <Button v-if="tab.active" :class="$style.close" size="tiny" square icon="close" @click.stop="$emit('close', tab)"/>
    </Block>
</template>

<style module lang="sass">
@use "@/styles/base/size"
@use "@/styles/base/color"

.tab
    flex: 0 1 auto
    position: relative
    display: flex
    flex-wrap: nowrap
    align-items: center
    justify-content: space-between
    padding: 0 5px 0 size.$spacing-2
    border-radius: size.$radius-size-large
    width: 180px
    font-weight: 700

    &.active
        background-color: color.$light-mode-background-color
        @media (prefers-color-scheme: dark)
            background-color: color.$dark-mode-background-color

    &:not(.active)
        font-weight: 500
        color: color.$light-mode-secondary-text-color
        border: solid 1px color.$light-mode-block-color
        @media (prefers-color-scheme: dark)
            color: color.$dark-mode-secondary-text-color
            border-color: color.$dark-mode-block-color

        &:hover
            background-color: color.$light-mode-background-color
            @media (prefers-color-scheme: dark)
                background-color: color.$dark-mode-background-color

    > .close
        font-size: size.$font-size-small
        flex: 0 0 auto
</style>