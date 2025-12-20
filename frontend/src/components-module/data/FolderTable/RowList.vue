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
    <!-- Tips: 此处修复了一个神奇的bug。由于editPosition发生变化时整个RowList的项一定被重新渲染，此时视图视口会跳转到最近的上一个项，也就是当前List的父节点。于是就会发生当父节点不在视口内尝试重命名或新建子项时，视口总是会跳转到父节点。 -->
    <!-- 目前的修复方案是让editPosition之前的项的渲染固定下来，这样按照这个逻辑，视图视口会跳转到最近的上一个项，也就是新建/编辑项的前一个项，按这种逻辑是不会出现跳转了(邻近项总该在视口里吧？) -->
    <Row v-for="child in (createPositionInThis !== null ? data.slice(0, createPositionInThis) : data)" :key="child.id" :indent="indent" :row="child" :parent-id="parentId"/>
    <template v-if="editPosition && createPositionInThis !== null">
        <RowCreating v-if="editPosition.action === 'create'" :indent="indent" :parent-id="parentId" :ordinal="createPositionInThis" :type="editPosition.type"/>
        <RowEditing v-else :indent="indent" :parent-id="parentId" :row="data[createPositionInThis]"/>
        <Row v-for="child in data.slice(editPosition.action === 'create' ? createPositionInThis : createPositionInThis + 1)" :key="child.id" :indent="indent" :row="child" :parent-id="parentId"/>
    </template>
</template>
