<script setup lang="ts">
import { Starlight, Icon } from "@/components/universal"

defineProps<{
    value: number | null
}>()

</script>

<template>
    <Starlight v-if="value !== null" :value="value" show-text/>
    <div v-else class="has-text-secondary">
        <Icon icon="star-half"/>
        <i>没有评分</i>
    </div>
</template>
