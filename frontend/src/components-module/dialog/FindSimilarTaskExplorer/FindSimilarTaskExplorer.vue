<script setup lang="ts">
import { FindSimilarTaskExplorerProps } from "./context"
import TaskCreator from "./TaskCreator.vue"
import TaskList from "./TaskList.vue"

defineProps<{
    p: FindSimilarTaskExplorerProps
}>()

defineEmits<{
    (e: "close"): void
}>()

</script>

<template>
    <div>
        <TaskCreator v-if="p.mode === 'create'" @close="$emit('close')"/>
        <TaskList v-else @close="$emit('close')"/>
    </div>
</template>