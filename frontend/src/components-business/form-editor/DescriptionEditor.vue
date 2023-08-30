<script setup lang="ts">
import { Input } from "@/components/form"

defineProps<{
    value: string
}>()

defineEmits<{
    (e: "update:value", value: string): void
    (e: "save"): void
}>()

</script>

<template>
    <div>
        <Input type="textarea" placeholder="描述" width="fullwidth" size="small" :value="value" @update:value="$emit('update:value', $event)" @enter="$emit('save')" update-on-input auto-focus/>
    </div>
</template>
