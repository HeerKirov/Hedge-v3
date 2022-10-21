<script setup lang="ts">
import { computed, ref } from "vue"
import { TagNodeElement } from "@/components-business/element"
import { TagTreeNode } from "@/functions/http-client/api/tag"
import { useTagTreeContext } from "./context"
import ExpandedButton from "./ExpandedButton.vue"
import TagNodeList from "./TagNodeList.vue"

const props = defineProps<{
    node: TagTreeNode
}>()

const { expandedState, menu } = useTagTreeContext()

const expanded = computed({
    get: () => expandedState.get(props.node.id),
    set: value => expandedState.set(props.node.id, value)
})

const contextmenu = () => menu(props.node)

</script>

<template>
    <template v-if="!!node.children?.length">
        <p>
            <TagNodeElement :node="node" @contextmenu="contextmenu"/>
            <ExpandedButton class="ml-2" v-model:expanded="expanded" @contextmenu="contextmenu"/>
        </p>
        <TagNodeList v-if="expanded" class="ml-4 mt-1" :parent-id="node.id" :nodes="node.children ?? []"/>
    </template>
    <TagNodeElement v-else :node="node" @contextmenu="contextmenu"/>
</template>

<style module lang="sass">

</style>
