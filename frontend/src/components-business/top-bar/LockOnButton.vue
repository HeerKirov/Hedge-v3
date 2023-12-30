<script setup lang="ts">
import { Button } from "@/components/universal"

defineProps<{
    value?: boolean
}>()

defineEmits<{
    (e: "update:value", value: boolean): void
}>()

</script>

<template>
    <Button class="flex-item no-grow-shrink" square :type="value ? 'danger' : undefined" :icon="value ? 'lock-open' : 'lock'" @click="$emit('update:value', !value)"/>
</template>
