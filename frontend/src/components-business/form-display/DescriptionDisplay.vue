<script setup lang="ts">
import { WrappedText, Block } from "@/components/universal"

defineProps<{
    value: string
    exported?: boolean
}>()

</script>

<template>
    <Block :class="$style.block">
        <WrappedText v-if="value" class="is-font-size-small selectable" :value="value"/>
        <i v-else class="secondary-text">没有描述。</i>
        <Block v-if="value && exported" :class="[$style.exported, 'has-text-secondary']" mode="transparent">EXPORTED</Block>
    </Block>
</template>

<style module lang="sass">
@import "../../styles/base/size"
.block
    position: relative
    padding: $spacing-1 $spacing-2
    max-height: 200px
    overflow: auto
    &::-webkit-scrollbar
        display: none

    .exported
        position: absolute
        right: 2px
        bottom: 2px
        padding: 0 2px
        font-size: $font-size-tiny
</style>