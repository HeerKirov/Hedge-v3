<script setup lang="ts">
import { computed, ref } from "vue"
import { TagNodeElement } from "@/components-business/element"
import { TagTreeNode } from "@/functions/http-client/api/tag"
import { useTagDroppable, useTagTreeContext } from "./context"
import ExpandedButton from "./ExpandedButton.vue"
import TagNodeList from "./TagNodeList.vue"

const props = defineProps<{
    node: TagTreeNode
}>()

const { expandedState, indexedData, isDraggable, menu, emit } = useTagTreeContext()

const expanded = computed({
    get: () => expandedState.get(props.node.id),
    set: value => expandedState.set(props.node.id, value)
})

const draggable = computed(() => isDraggable(props.node))

const { dragover: _, ...dropEvents } = useTagDroppable(computed(() => props.node.id), null)

const click = () => {
    const indexed = indexedData.indexedData.value[props.node.id]
    if(indexed) {
        emit.click(props.node, indexed.parentId, indexed.ordinal)
    }
}

const contextmenu = () => menu(props.node)

</script>

<template>
    <template v-if="!!node.children?.length">
        <p :class="$style['expanded-button-element']" v-bind="dropEvents">
            <ExpandedButton :class="$style['expanded-button']" v-model:expanded="expanded" @contextmenu="contextmenu"/>
            <TagNodeElement :node="node" :draggable="draggable" @contextmenu="contextmenu" @click="click"/>
        </p>
        <TagNodeList v-if="expanded" :parent-id="node.id" :nodes="node.children ?? []"/>
    </template>
    <TagNodeElement v-else :node="node" :draggable="draggable" v-bind="dropEvents" @contextmenu="contextmenu" @click="click"/>
</template>

<style module lang="sass">
.expanded-button-element
    position: relative
    > .expanded-button
        position: absolute
        left: 0
        transform: translateX(-100%)
</style>
