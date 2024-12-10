<script setup lang="ts">
import { WrappedText, Block, Icon } from "@/components/universal"

defineProps<{
    value: string
    exported?: boolean
    placeholder?: string
    newSkin?: boolean
}>()

</script>

<template>
    <div v-if="newSkin" class="relative flex gap-1">
        <div :class="{'has-text-secondary': !value}"><Icon icon="comment-dots"/></div>
        <div v-if="!!value" :class="[$style.scroll, 'selectable']"><WrappedText :value="value"/></div>
        <i v-else class="has-text-secondary">{{ placeholder ?? '没有描述' }}</i>
        <Block v-if="value && exported" :class="[$style.exported, 'has-text-secondary']" mode="transparent">EXPORTED</Block>
    </div>
    <Block v-else :class="$style.block">
        <WrappedText v-if="value" :class="['selectable', $style.text]" :value="value"/>
        <i v-else class="secondary-text">{{ placeholder ?? '没有描述。' }}</i>
        <Block v-if="value && exported" :class="[$style.exported, 'has-text-secondary']" mode="transparent">EXPORTED</Block>
    </Block>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.scroll
    max-height: 200px
    overflow: auto
    &::-webkit-scrollbar
        display: none

.block
    position: relative
    padding: size.$spacing-1 size.$spacing-2
    max-height: 200px
    overflow: auto
    &::-webkit-scrollbar
        display: none

    .text
        font-size: size.$font-size-small
        &:not(:first-child)
            margin-top: size.$spacing-1

.exported
    position: absolute
    right: 2px
    bottom: 2px
    padding: 0 2px
    font-size: size.$font-size-tiny
</style>