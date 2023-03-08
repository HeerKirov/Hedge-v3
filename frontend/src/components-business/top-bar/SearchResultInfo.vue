<script setup lang="ts">
import { Button } from "@/components/universal"

defineProps<{
    current: number
    total: number
    size?: "std" | "small" | "large"
}>()

defineEmits<{
    (e: "next"): void
    (e: "prev"): void
}>()

</script>

<template>
    <div>
        <span v-if="total > 0" class="px-2 no-wrap">{{current + 1}} / {{total}}</span>
        <span v-else class="px-2 no-wrap has-text-danger">无结果</span>
        <Button square :size="size" icon="arrow-up" :disabled="total <= 0" @click="$emit('prev')"/>
        <Button square :size="size" icon="arrow-down" :disabled="total <= 0" @click="$emit('next')"/>
    </div>
</template>

<style module lang="sass">

</style>
