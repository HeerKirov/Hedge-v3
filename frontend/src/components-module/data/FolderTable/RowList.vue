<script setup lang="ts">
import { computed } from "vue"
import { FolderTreeNode } from "@/functions/http-client/api/folder"
import { useFolderTreeContext } from "./context"
import RowCreating from "./RowCreating.vue"
import RowEditing from "./RowEditing.vue"
import Row from "./Row.vue"

const props = defineProps<{
    data: FolderTreeNode[]
    parentId: number | null
    indent: number
}>()

const { editPosition } = useFolderTreeContext()

const createPositionInThis = computed(() => {
    if(editPosition.value !== undefined && editPosition.value.parentId === props.parentId) {
        if(editPosition.value.action === "edit") {
            const id = editPosition.value.id
            const idx = props.data.findIndex(i => i.id === id)
            return idx >= 0 ? idx : null
        }
        return editPosition.value.ordinal
    }
    return null
})

</script>

<template>
    <template v-if="editPosition && createPositionInThis !== null">
        <Row v-for="child in data.slice(0, createPositionInThis)" :key="child.id" :indent="indent" :row="child" :parent-id="parentId"/>
        <RowCreating v-if="editPosition.action === 'create'" :indent="indent" :parent-id="parentId" :ordinal="createPositionInThis" :type="editPosition.type"/>
        <RowEditing v-else :indent="indent" :parent-id="parentId" :row="data[createPositionInThis]"/>
        <Row v-for="child in data.slice(editPosition.action === 'create' ? createPositionInThis : createPositionInThis + 1)" :key="child.id" :indent="indent" :row="child" :parent-id="parentId"/>
    </template>
    <Row v-else v-for="child in data" :key="child.id" :indent="indent" :row="child" :parent-id="parentId"/>
</template>
