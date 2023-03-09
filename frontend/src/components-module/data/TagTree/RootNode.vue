<script setup lang="ts">
import { computed } from "vue"
import { Block } from "@/components/universal"
import { TagTreeNode } from "@/functions/http-client/api/tag"
import { useDraggable } from "@/modules/drag"
import { useTagDroppable, useTagTreeContext } from "./context"
import ExpandedButton from "./ExpandedButton.vue"
import TagNodeList from "./TagNodeList.vue"

const props = defineProps<{
    node: TagTreeNode
}>()

const { expandedState, elementRefs, indexedData, isDraggable, emit, menu } = useTagTreeContext()

const expanded = computed({
    get: () => expandedState.get(props.node.id),
    set: value => expandedState.set(props.node.id, value)
})

const draggable = computed(() => isDraggable(props.node))

const isJumpTarget = computed(() => elementRefs.jumpTarget.value === props.node.id)

const { dragover: _, ...dropEvents } = useTagDroppable(computed(() => props.node.id), null)

const dragEvents = useDraggable("tag",() => ({
    id: props.node.id,
    name: props.node.name,
    color: props.node.color
}))

const click = () => {
    if(elementRefs.jumpTarget.value === props.node.id) {
        elementRefs.jumpTarget.value = null
    }
    const indexed = indexedData.indexedData.value[props.node.id]
    if(indexed) {
        emit.click(props.node, indexed.parentId, indexed.ordinal)
    }
}

const dblclick = () => {
    const indexed = indexedData.indexedData.value[props.node.id]
    if(indexed) {
        emit.dblclick(props.node, indexed.parentId, indexed.ordinal)
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
    <Block :class="{[`has-text-${node.color}`]: !!node.color, [$style.root]: true}">
        <p :class="{'is-font-size-large': true, [$style['jump-target']]: isJumpTarget}" v-bind="dropEvents" @contextmenu="contextmenu" @click="click" @dblclick="dblclick">
            <ExpandedButton v-model:expanded="expanded"/>
            <span :ref="el => elementRefs.setElement(node.id, el)" :draggable="draggable" v-bind="dragEvents">{{node.name}}</span>
        </p>
        <div v-if="expanded" :class="$style['root-node-list']">
            <TagNodeList multi-line :parent-id="node.id" :nodes="node.children ?? []"/>
        </div>
    </Block>
</template>

<style module lang="sass">
@import "../../../styles/base/size"
@import "../../../styles/base/color"

.root
    padding: $spacing-3 $spacing-2

.root-node-list
    padding-left: $spacing-2
    margin-top: $spacing-3
    border-top: solid 1px $light-mode-border-color
    @media (prefers-color-scheme: dark)
        border-top-color: $dark-mode-border-color

.jump-target
    border-radius: $radius-size-std
    @media (prefers-color-scheme: light)
        border: solid 2px $light-mode-warning
    @media (prefers-color-scheme: dark)
        border: solid 2px $dark-mode-warning
</style>
