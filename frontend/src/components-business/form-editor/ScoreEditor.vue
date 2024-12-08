<script setup lang="ts">
import { Starlight, Block } from "@/components/universal"

defineProps<{
    value: number | null
    exported?: boolean
    mode?: "colorful" | "none"
}>()

defineEmits<{
    (e: "update:value", value: number | null): void
}>()

</script>

<template>
    <div>
        <Starlight :value="value" @update:value="$emit('update:value', $event)" show-text editable :mode="mode"/>
        <Block v-if="value !== null && exported" :class="[$style.exported, 'has-text-secondary']">EXPORTED</Block>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.exported
    display: inline-block
    padding: 0 size.$spacing-half
    margin-left: size.$spacing-1
    font-size: size.$font-size-tiny
</style>