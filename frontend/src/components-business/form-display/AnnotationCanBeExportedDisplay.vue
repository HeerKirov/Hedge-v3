<script setup lang="ts">
import { Icon } from "@/components/universal"

defineProps<{
    value: boolean
}>()

</script>

<template>
    <div v-if="value">
        <Icon icon="share-square"/>
        可导出至图库项目
    </div>
    <div v-else class="has-text-secondary">
        <Icon icon="share-square"/>
        不可导出至图库项目
    </div>
</template>
