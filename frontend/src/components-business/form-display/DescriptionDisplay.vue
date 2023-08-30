<script setup lang="ts">
import { WrappedText, Block } from "@/components/universal"

defineProps<{
    value: string
}>()

</script>

<template>
    <Block :class="$style.block">
        <WrappedText v-if="value" class="is-font-size-small selectable" :value="value"/>
        <i v-else class="secondary-text">没有描述。</i>
    </Block>
</template>

<style module lang="sass">
@import "../../styles/base/size"
.block
    padding: $spacing-1 $spacing-2
    max-height: 200px
    overflow: auto
    &::-webkit-scrollbar
        display: none
</style>