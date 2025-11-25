<script setup lang="ts">
import { TopicChildrenNode } from "@/functions/http-client/api/topic"
import ChildrenTreeModeItem from "./ChildrenTreeModeItem.vue"

defineProps<{
    children: TopicChildrenNode[]
}>()

const emit = defineEmits<{
    (e: "click", topicId: number): void
}>()

</script>

<template>
    <div class="flex multiline gap-1">
        <ChildrenTreeModeItem v-for="child in children" :key="child.id" :child="child" @click="$emit('click', $event)"/>
    </div>
</template>

