<script setup lang="ts">
import { Button } from "@/components/universal"

const props = withDefaults(defineProps<{
    value?: "cover" | "contain"
}>(), {
    value: "cover"
})

const emit = defineEmits<{
    (e: "update:value", v: "cover" | "contain"): void
}>()

const click = () => emit("update:value", props.value === "cover" ? "contain" : "cover")

</script>

<template>
    <Button class="flex-item no-grow-shrink" square :icon="value === 'cover' ? 'compress' : 'compress-arrows-alt'" @click="click"/>
</template>
