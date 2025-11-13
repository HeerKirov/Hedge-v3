<script setup lang="ts">
import { Colors } from "@/constants/ui"

defineProps<{
    name: string
    otherNames: string[]
    color: Colors | null
}>()

</script>

<template>
    <b :class="{[`has-text-${color}`]: !!color, 'is-font-size-h3': true}">{{name}}</b>
    <i class="secondary-text ml-1">{{otherNames.join(" / ")}}</i>
</template>

