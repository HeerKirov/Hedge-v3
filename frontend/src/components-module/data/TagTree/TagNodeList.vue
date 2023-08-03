<script setup lang="ts">
import { TagTreeNode } from "@/functions/http-client/api/tag"
import Gap from "./Gap.vue"
import TagNode from "./TagNode.vue"

defineProps<{
    nodes: TagTreeNode[]
    parentId: number | null
    multiline?: boolean
}>()

</script>

<template>
    <div v-if="multiline || nodes.some(t => !!t.children?.length)" :class="$style.root">
        <template v-for="(node, index) in nodes" :key="node.id">
            <Gap :class="$style.gap" :parent-id="parentId" :ordinal="index"/>
            <div :class="$style.child">
                <TagNode :node="node"/>
            </div>
        </template>
        <Gap :class="$style.gap" :parent-id="parentId" :ordinal="nodes.length"/>
        <!-- FUTURE 多个层级嵌套时gap会多层，观感不太好。最好有个方案，能合理地只保留一层 -->
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
    margin-left: 1.25rem

    &.inline
        display: flex
        flex-wrap: wrap
        align-items: center
        margin-top: 0.25rem

        > .gap
            width: 0.3rem
            height: 1.5em
            &:first-child
                margin-left: -0.25rem

    &:not(.inline)
        display: flex
        flex-wrap: nowrap
        flex-direction: column
        padding-top: 0.25rem

        > .gap
            height: 0.4rem

</style>
