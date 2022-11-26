<script setup lang="ts">
import { Button } from "@/components/universal"

defineProps<{
    current: number
    total: number
}>()

defineEmits<{
    (e: "next"): void
    (e: "prev"): void
}>()

</script>

<template>
    <span v-if="total > 0" class="px-2 no-wrap">{{current + 1}} / {{total}}</span>
    <span v-else class="px-2 no-wrap has-text-danger">无结果</span>
    <Button square icon="arrow-up" :disabled="total <= 0" @click="$emit('prev')"/>
    <Button square icon="arrow-down" :disabled="total <= 0" @click="$emit('next')"/>
</template>

<style module lang="sass">

</style>
