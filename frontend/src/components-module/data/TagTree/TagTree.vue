<script setup lang="ts">
import { toRef } from "vue"
import { TagTreeNode } from "@/functions/http-client/api/tag"
import { installTagTreeContext } from "./context"
import Gap from "./Gap.vue"
import RootNode from "./RootNode.vue"

const props = defineProps<{
    /**
     * 所有tag数据。
     */
    tags?: TagTreeNode[]
    /**
     * 创建占位符。指定此属性时，在指定位置插入创建操作占位符。
     */
    createPosition?: {parentId: number, ordinal: number}
    /**
     * 是否允许编辑类操作。这将开启右键菜单的编辑类选项。
     */
    editable?: boolean
    /**
     * 是否允许拖放标签操作。这将允许拖放标签到空隙以重新排序标签。
     */
    droppable?: boolean
    /**
     * 是否可拖曳标签。传入一个函数时，使用函数结果决定每一个标签是否可托曳。
     */
    draggable?: boolean | ((tag: TagTreeNode) => boolean)
}>()

const emit = defineEmits<{
    /**
     * 单击某个标签。
     */
    (e: "click", tag: TagTreeNode, parentId: number | null, ordinal: number): void
    /**
     * 选择右键菜单的删除选项。
     */
    (e: "delete", tag: TagTreeNode, parentId: number | null, ordinal: number): void
    /**
     * 选择右键菜单的创建选项。参数是插入位置的参数。
     */
    (e: "create", parentId: number | null, ordinal: number): void
    /**
     * 进行拖放的操作。
     */
    (e: "move", tag: TagTreeNode, moveToParentId: number | null | undefined, moveToOrdinal: number): void
}>()

const { elementRefs } = installTagTreeContext({
    data: toRef(props, "tags"),
    createPosition: toRef(props, "createPosition"),
    editable: toRef(props, "editable"),
    droppable: toRef(props, "droppable"),
    draggable: toRef(props, "draggable"),
    emit: {
        click: (tag, parentId, ordinal) => emit("click", tag, parentId, ordinal),
        delete: (tag, parentId, ordinal) => emit("delete", tag, parentId, ordinal),
        create: (parentId, ordinal) => emit("create", parentId, ordinal),
        move: (tag, p, o) => emit("move", tag, p, o)
    }
})

defineExpose({
    jumpTo: elementRefs.jumpTo
})

</script>

<template>
    <template v-for="(node, index) in tags ?? []" :key="node.id">
        <Gap :class="$style.gap" :parent-id="null" :ordinal="index"/>
        <RootNode :node="node"/>
    </template>
    <Gap :class="$style.gap" :parent-id="null" :ordinal="tags?.length ?? 0"/>
</template>

<style module lang="sass">
.gap
    height: 0.75rem
</style>
