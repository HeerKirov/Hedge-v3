<script setup lang="ts">

defineProps<{
    timeCost: number | null | undefined
}>()

</script>

<template>
    <div v-if="timeCost !== null && timeCost !== undefined" :class="['has-text-right', 'has-text-secondary', 'is-font-size-tiny', 'pr-1']"><b>COST</b> {{timeCost}}ms</div>
</template>
