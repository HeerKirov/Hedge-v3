<script setup lang="ts">
import { Icon } from "@/components/universal"

defineProps<{
    value?: boolean | null
}>()

defineEmits<{
    (e: "update:value", value: boolean): void
}>()

</script>

<template>
    <span :class="value ? 'has-text-danger' : undefined" @click="$emit('update:value', !value)">
        <Icon :icon="value ? 'heart' : 'heart-regular'"/>
    </span>
</template>
