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
    <div class="relative">
        <Starlight :value="value" @update:value="$emit('update:value', $event)" show-text editable :mode="mode"/>
        <Block v-if="value !== null && exported" :class="[$style.exported, 'has-text-secondary']">EXPORTED</Block>
    </div>
</template>

<style module lang="sass">
@import "../../styles/base/size"

.exported
    position: absolute
    right: 3px
    bottom: 0
    display: inline-block
    padding: 0 2px
    font-size: $font-size-tiny
</style>