<script setup lang="ts">

defineProps<{
    name: string
    otherNames: string[]
    color: string
}>()

</script>

<template>
    <b :class="{[`has-text-${color}`]: !!color, 'is-font-size-large': true, ['is-cursor-text']: true}">{{name}}</b>
    <i class="secondary-text is-cursor-text ml-1">{{otherNames.join(" / ")}}</i>
</template>

