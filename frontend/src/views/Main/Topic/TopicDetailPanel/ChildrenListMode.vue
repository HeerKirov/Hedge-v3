<script setup lang="ts">
import { computed, Ref } from "vue"
import { Group } from "@/components/layout"
import { SimpleMetaTagElement } from "@/components-business/element"
import { TopicChildrenNode, TopicType } from "@/functions/http-client/api/topic"

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

    function recursive(children: TopicChildrenNode[]) {
        for (const child of children) {
            if(child.type === "IP") ipList.push(child)
            else if(child.type === "CHARACTER") characterList.push(child)
            else if(child.type === "UNKNOWN") unknownList.push(child)
            if(child.type !== "CHARACTER" && child.children?.length) recursive(child.children)
        }
    }
    recursive(props.children)

    return {
        "COPYRIGHT": [],
        "IP": ipList,
        "CHARACTER": characterList,
        "UNKNOWN": unknownList
    }
})

</script>

<template>
    <Group>
        <SimpleMetaTagElement v-for="child in list['IP']" type="topic" :value="child" clickable @click="$emit('click', child.id)"/>
    </Group>
    <Group>
        <SimpleMetaTagElement v-for="child in list['CHARACTER']" type="topic" :value="child" clickable @click="$emit('click', child.id)"/>
    </Group>
    <Group>
        <SimpleMetaTagElement v-for="child in list['UNKNOWN']" type="topic" :value="child" clickable @click="$emit('click', child.id)"/>
    </Group>
</template>

<style module lang="sass">

</style>
