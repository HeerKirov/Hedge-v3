<script setup lang="ts">
import { computed } from "vue"
import { FolderTreeNode } from "@/functions/http-client/api/folder"
import { useFolderTreeContext } from "./context"
import RowCreating from "./RowCreating.vue"
import Row from "./Row.vue"

const props = defineProps<{
    data: FolderTreeNode[]
    parentId: number | null
    indent: number
}>()

const { createPosition } = useFolderTreeContext()

const createPositionInThis = computed(() => createPosition.value !== undefined && createPosition.value.parentId === props.parentId ? createPosition.value.ordinal : null)

</script>

<template>
    <template v-if="createPositionInThis !== null">
        <Row v-for="child in data.slice(0, createPositionInThis)" :key="child.id" :indent="indent" :row="child" :parent-id="parentId"/>
        <RowCreating :indent="indent" :parent-id="parentId" :ordinal="createPositionInThis"/>
        <Row v-for="child in data.slice(createPositionInThis)" :key="child.id" :indent="indent" :row="child" :parent-id="parentId"/>
    </template>
    <Row v-else v-for="child in data" :key="child.id" :indent="indent" :row="child" :parent-id="parentId"/>
</template>
