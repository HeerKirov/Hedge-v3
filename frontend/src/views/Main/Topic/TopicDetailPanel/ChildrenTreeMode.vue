<script setup lang="ts">
import { computed } from "vue"
import { Group } from "@/components/layout"
import { TopicChildrenNode } from "@/functions/http-client/api/topic"
import { arrays } from "@/utils/primitives"
import ChildrenTreeModeItem from "./ChildrenTreeModeItem.vue"

const props = defineProps<{
    children: TopicChildrenNode[]
}>()

const emit = defineEmits<{
    (e: "click", topicId: number): void
}>()

</script>

<template>
    <div class="flex multiline gap-half">
        <ChildrenTreeModeItem v-for="child in children" :key="child.id" :child="child" @click="$emit('click', $event)"/>
    </div>
</template>

