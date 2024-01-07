<script setup lang="ts">
import { FindSimilarTaskExplorerProps } from "./context"
import TaskCreator from "./TaskCreator.vue"
import TaskList from "./TaskList.vue"
import QuickFind from "@/components-module/dialog/FindSimilarTaskExplorer/QuickFind.vue";

defineProps<{
    p: FindSimilarTaskExplorerProps
}>()

defineEmits<{
    (e: "close"): void
}>()

</script>

<template>
    <div class="h-100">
        <TaskCreator v-if="p.mode === 'create'" @close="$emit('close')"/>
        <TaskList v-else-if="p.mode === 'list'"/>
        <QuickFind v-else-if="p.mode === 'quickFind'" :illusts="p.illusts" @close="$emit('close')"/>
    </div>
</template>