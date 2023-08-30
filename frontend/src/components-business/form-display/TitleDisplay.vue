<script setup lang="ts">

defineProps<{
    value: string
}>()

</script>

<template>
    <p v-if="value" class="py-1 selectable">{{value}}</p>
    <p v-else class="py-1"><i class="secondary-text">没有标题</i></p>
</template>

