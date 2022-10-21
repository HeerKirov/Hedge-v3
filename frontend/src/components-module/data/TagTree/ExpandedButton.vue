<script setup lang="ts">
import { Icon } from "@/components/universal"

defineProps<{
    expanded?: boolean
}>()

defineEmits<{
    (e: "update:expanded", value: boolean): void
}>()

</script>

<template>
    <button :class="$style.button" @click="$emit('update:expanded', !expanded)">
        <Icon :icon="expanded ? 'caret-down' : 'caret-right'"/>
    </button>
</template>

<style module lang="sass">
@import "../../../styles/base/size"

.button
    color: inherit
    background-color: transparent
    padding: 0
    cursor: pointer
    &:hover
        opacity: 0.75
</style>
