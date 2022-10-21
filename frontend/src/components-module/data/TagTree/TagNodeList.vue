<script setup lang="ts">
import { TagTreeNode } from "@/functions/http-client/api/tag"
import Gap from "./Gap.vue"
import TagNode from "./TagNode.vue"

defineProps<{
    nodes: TagTreeNode[]
    parentId: number | null
    multiLine?: boolean
}>()

</script>

<template>
    <div v-if="multiLine || nodes.some(t => !!t.children?.length)" :class="$style.root">
        <template v-for="(node, index) in nodes" :key="node.id">
            <Gap :class="$style.gap" :parent-id="parentId" :ordinal="index"/>
            <div :class="$style.child">
                <TagNode :node="node"/>
            </div>
        </template>
        <Gap :parent-id="parentId" :ordinal="nodes.length"/>
    </div>
    <div v-else :class="[$style.root, $style.inline]">
        <template v-for="(node, index) in nodes" :key="node.id">
            <Gap :class="$style.gap" :parent-id="parentId" :ordinal="index"/>
            <TagNode :class="$style.child" :node="node"/>
        </template>
        <Gap :class="$style.gap" :parent-id="parentId" :ordinal="nodes.length"/>
    </div>
</template>

<style module lang="sass">
.root
    &.inline
        display: flex
        flex-wrap: wrap
        align-items: center

        > .gap
            width: 0.3rem
            height: 2em
            &:first-child
                margin-left: -0.25rem

    &:not(.inline)
        display: flex
        flex-wrap: nowrap
        flex-direction: column
        padding-top: 0.25rem

        > .gap
            height: 0.4rem
        > .child > p
            display: inline-flex
</style>
