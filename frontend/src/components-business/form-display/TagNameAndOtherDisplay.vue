<script setup lang="ts">

defineProps<{
    name: string
    otherNames: string[]
    color: string
}>()

</script>

<template>
    <b :class="{[`has-text-${color}`]: !!color, 'is-font-size-large': true}">{{name}}</b>
    <i class="secondary-text ml-1">{{otherNames.join(" / ")}}</i>
</template>

