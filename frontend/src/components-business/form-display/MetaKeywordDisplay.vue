<script setup lang="ts">
import { Tag } from "@/components/universal"
import { Colors } from "@/constants/ui"

withDefaults(defineProps<{
    value: string[]
    color?: Colors
    multiline?: boolean
    showEmpty?: boolean
}>(), {
    multiline: true,
    showEmpty: false
})

</script>

<template>
    <div :class="['flex', 'gap-half', {'multiline': multiline}]">
        <Tag v-for="item in value" brackets="[]" line-style="none" :color>{{ item }}</Tag>
        <Tag v-if="showEmpty && value.length === 0" brackets="[]" line-style="none" color="secondary">没有关键词</Tag>
    </div>
</template>