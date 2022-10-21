<script setup lang="ts">
import { computed } from "vue"
import { Block } from "@/components/universal"
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
    <Block :class="{[`has-text-${node.color}`]: !!node.color, 'px-4': true, 'py-3': true}">
        <p class="is-font-size-large" @contextmenu="contextmenu">
            {{node.name}}
            <ExpandedButton v-model:expanded="expanded"/>
        </p>
        <div v-if="expanded" :class="$style['root-node-list']">
            <TagNodeList multi-line :parent-id="node.id" :nodes="node.children ?? []"/>
        </div>
    </Block>
</template>

<style module lang="sass">
@import "../../../styles/base/size"
@import "../../../styles/base/color"

.root-node-list
    padding-left: $spacing-2
    margin-top: $spacing-3
    border-top: solid 1px $light-mode-border-color
    @media (prefers-color-scheme: dark)
        border-top-color: $dark-mode-border-color
</style>
