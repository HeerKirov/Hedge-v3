<script setup lang="ts">
import { computed } from "vue"
import { TagNodeElement } from "@/components-business/element"
import { TagTreeNode } from "@/functions/http-client/api/tag"
import { useTagDroppable, useTagTreeContext } from "./context"
import ExpandedButton from "./ExpandedButton.vue"
import TagNodeList from "./TagNodeList.vue"

const props = defineProps<{
    node: TagTreeNode
}>()

const { expandedState, elementRefs, indexedData, isDraggable, menu, emit } = useTagTreeContext()

const expanded = computed({
    get: () => expandedState.get(props.node.id),
    set: value => expandedState.set(props.node.id, value)
})

const draggable = computed(() => isDraggable(props.node))

const isJumpTarget = computed(() => elementRefs.jumpTarget.value === props.node.id)

const { dragover: _, ...dropEvents } = useTagDroppable(computed(() => props.node.id), null)

const click = (e: MouseEvent) => {
    if(elementRefs.jumpTarget.value === props.node.id) {
        elementRefs.jumpTarget.value = null
    }
    const indexed = indexedData.indexedData.value[props.node.id]
    if(indexed) {
        emit.click(props.node, indexed.parentId, indexed.ordinal, e)
    }
}

const dblclick = (e: MouseEvent) => {
    const indexed = indexedData.indexedData.value[props.node.id]
    if(indexed) {
        emit.dblclick(props.node, indexed.parentId, indexed.ordinal, e)
    }
}

const contextmenu = () => {
    if(elementRefs.jumpTarget.value === props.node.id) {
        elementRefs.jumpTarget.value = null
    }
    menu(props.node)
}

</script>

<template>
    <template v-if="!!node.children?.length">
        <p :class="$style['expanded-button-element']" v-bind="dropEvents">
            <ExpandedButton :class="$style['expanded-button']" v-model:expanded="expanded" @contextmenu="contextmenu"/>
            <span :ref="el => elementRefs.setElement(node.id, el)" :class="{[$style['jump-target']]: isJumpTarget}">
                <TagNodeElement :node="node" :draggable="draggable" @contextmenu="contextmenu" @click="click" @dblclick="dblclick"/>
            </span>
        </p>
        <TagNodeList v-if="expanded" :parent-id="node.id" :nodes="node.children ?? []"/>
    </template>
    <span v-else :ref="el => elementRefs.setElement(node.id, el)" :class="{[$style['jump-target']]: isJumpTarget}">
        <TagNodeElement :node="node" :draggable="draggable" v-bind="dropEvents" @contextmenu="contextmenu" @click="click" @dblclick="dblclick"/>
    </span>
</template>

<style module lang="sass">
@use "@/styles/base/color"
@use "@/styles/base/size"

.expanded-button-element
    position: relative
    > .expanded-button
        position: absolute
        left: 0
        transform: translateX(-100%)

.jump-target
    border-radius: size.$radius-size-std
    padding: size.$spacing-half size.$spacing-1
    @media (prefers-color-scheme: light)
        border: solid 2px color.$light-mode-warning
    @media (prefers-color-scheme: dark)
        border: solid 2px color.$dark-mode-warning
</style>
