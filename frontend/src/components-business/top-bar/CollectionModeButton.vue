<script setup lang="ts">
import { Button } from "@/components/universal"

defineProps<{
    value?: boolean
}>()

defineEmits<{
    (e: "update:value", v: boolean): void
}>()

</script>

<template>
    <Button square :icon="value ? 'images' : 'file-image'" @click="$emit('update:value', !value)"/>
</template>
