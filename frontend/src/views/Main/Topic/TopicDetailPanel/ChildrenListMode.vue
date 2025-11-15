<script setup lang="ts">
import { computed, Ref } from "vue"
import { Group } from "@/components/layout"
import { SimpleMetaTagElement } from "@/components-business/element"
import { SimpleTopic, TopicChildrenNode, TopicType } from "@/functions/http-client/api/topic"
import { useDraggableDynamic } from "@/modules/drag"

const props = defineProps<{
    children: TopicChildrenNode[]
}>()

defineEmits<{
    (e: "click", topicId: number): void
}>()

const list: Ref<{[key in TopicType]: TopicChildrenNode[]}> = computed(() => {
    const ipList: TopicChildrenNode[] = []
    const characterList: TopicChildrenNode[] = []
    const unknownList: TopicChildrenNode[] = []
    const nodeList: TopicChildrenNode[] = []

    function recursive(children: TopicChildrenNode[]) {
        for (const child of children) {
            if(child.type === "IP") ipList.push(child)
            else if(child.type === "CHARACTER") characterList.push(child)
            else if(child.type === "UNKNOWN") unknownList.push(child)
            else if(child.type === "NODE") nodeList.push(child)
            if(child.children?.length) recursive(child.children)
        }
    }
    recursive(props.children)

    return {
        "COPYRIGHT": [],
        "IP": ipList,
        "CHARACTER": characterList,
        "UNKNOWN": unknownList,
        "NODE": nodeList
    }
})

const dragEvents = useDraggableDynamic("topic")

function childrenNodeToSimple(node: TopicChildrenNode): SimpleTopic {
    const { children, ...topic } = node
    return topic
}

</script>

<template>
    <Group>
        <SimpleMetaTagElement v-for="child in list['IP']" type="topic" :value="child" clickable @click="$emit('click', child.id)" draggable v-bind="dragEvents(() => childrenNodeToSimple(child))"/>
    </Group>
    <Group>
        <SimpleMetaTagElement v-for="child in list['CHARACTER']" type="topic" :value="child" clickable @click="$emit('click', child.id)" draggable v-bind="dragEvents(() => childrenNodeToSimple(child))"/>
    </Group>
    <Group>
        <SimpleMetaTagElement v-for="child in list['UNKNOWN']" type="topic" :value="child" clickable @click="$emit('click', child.id)" draggable v-bind="dragEvents(() => childrenNodeToSimple(child))"/>
    </Group>
    <Group>
        <SimpleMetaTagElement v-for="child in list['NODE']" type="topic" :value="child" clickable @click="$emit('click', child.id)" draggable v-bind="dragEvents(() => childrenNodeToSimple(child))"/>
    </Group>
</template>

<style module lang="sass">

</style>
