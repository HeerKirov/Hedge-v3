<script setup lang="ts">
import { Tag } from "@/components/universal"
import { Colors } from "@/constants/ui"

withDefaults(defineProps<{
    value: string[]
    color?: Colors
    multiline?: boolean
}>(), {
    multiline: true
})

</script>

<template>
    <div :class="['flex', 'gap-half', {'multiline': multiline}]">
        <Tag v-for="item in value" brackets="[]" line-style="none" :color>{{ item }}</Tag>
    </div>
</template>