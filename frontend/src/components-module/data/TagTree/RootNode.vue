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
    <Block :class="{[`has-text-${node.color}`]: !!node.color, [$style.root]: true}">
        <p :class="{'is-font-size-large': true, [$style['jump-target']]: isJumpTarget}" v-bind="dropEvents" @contextmenu="contextmenu" @click="click" @dblclick="dblclick">
            <ExpandedButton v-model:expanded="expanded"/>
            <span :ref="el => elementRefs.setElement(node.id, el)" :draggable="draggable" v-bind="dragEvents">{{node.name}}</span>
        </p>
        <div v-if="expanded" :class="$style['root-node-list']">
            <TagNodeList multiline :parent-id="node.id" :nodes="node.children ?? []"/>
        </div>
    </Block>
</template>

<style module lang="sass">
@use "@/styles/base/size"
@use "@/styles/base/color"

.root
    padding: size.$spacing-3 size.$spacing-2

.root-node-list
    padding-left: size.$spacing-2
    margin-top: size.$spacing-3
    border-top: solid 1px color.$light-mode-border-color
    @media (prefers-color-scheme: dark)
        border-top-color: color.$dark-mode-border-color

.jump-target
    border-radius: size.$radius-size-std
    @media (prefers-color-scheme: light)
        border: solid 2px color.$light-mode-warning
    @media (prefers-color-scheme: dark)
        border: solid 2px color.$dark-mode-warning
</style>
