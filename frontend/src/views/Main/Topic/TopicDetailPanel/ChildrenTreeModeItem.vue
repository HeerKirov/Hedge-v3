<script setup lang="ts">
import { SimpleMetaTagElement } from "@/components-business/element"
import { TopicChildrenNode } from "@/functions/http-client/api/topic"
import ChildrenTreeMode from "./ChildrenTreeMode.vue"

defineProps<{
    child: TopicChildrenNode
}>()

defineEmits<{
    (e: "click", topicId: number): void
}>()

</script>

<template>
    <template v-if="child.type !== 'CHARACTER' && !!child.children.length">
        <p>
            <SimpleMetaTagElement type="topic" :value="child" clickable @click="$emit('click', child.id)"/>
            <ChildrenTreeMode class="mt-2 ml-6" :children="child.children" @click="$emit('click', $event)"/>
        </p>
    </template>
    <SimpleMetaTagElement v-else type="topic" :value="child" clickable @click="$emit('click', child.id)"/>
</template>

<style module lang="sass">

</style>
