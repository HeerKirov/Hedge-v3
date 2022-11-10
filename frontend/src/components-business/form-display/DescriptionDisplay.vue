<script setup lang="ts">
import { WrappedText, Block } from "@/components/universal"

defineProps<{
    value: string
}>()

</script>

<template>
    <Block class="py-1 px-2">
        <WrappedText v-if="value" class="selectable" :value="value"/>
        <i v-else class="secondary-text">没有描述。</i>
    </Block>
</template>

