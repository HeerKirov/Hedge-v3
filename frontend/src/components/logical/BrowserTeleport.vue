<script setup lang="ts">
import { useCurrentTab } from "@/modules/browser"

defineProps<{
    to: "top-bar" | "side-bar"
}>()

const { active } = useCurrentTab()!

</script>

<template>
    <teleport v-if="active" :to="`#${to}`">
        <slot/>
    </teleport>
</template>
