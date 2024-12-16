<script setup lang="ts">
import { SimpleMetaTagElement } from "@/components-business/element"
import { TopicChildrenNode } from "@/functions/http-client/api/topic"
import { useDraggable } from "@/modules/drag"
import ChildrenTreeMode from "./ChildrenTreeMode.vue"

const props = defineProps<{
    child: TopicChildrenNode
}>()

defineEmits<{
    (e: "click", topicId: number): void
}>()

const dragEvents = useDraggable("topic", () => {
    const { children, ...topic } = props.child
    return topic
})

</script>

<template>
    <template v-if="child.type !== 'CHARACTER' && !!child.children?.length">
        <p>
            <SimpleMetaTagElement type="topic" :value="child" clickable @click="$emit('click', child.id)" draggable v-bind="dragEvents"/>
            <ChildrenTreeMode class="mt-2 ml-6" :children="child.children" @click="$emit('click', $event)"/>
        </p>
    </template>
    <SimpleMetaTagElement v-else type="topic" :value="child" clickable @click="$emit('click', child.id)" draggable v-bind="dragEvents"/>
</template>

<style module lang="sass">

</style>
