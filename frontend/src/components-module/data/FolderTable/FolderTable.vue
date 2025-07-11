<script setup lang="ts">
import { computed, toRef } from "vue"
import { FolderCreateForm, FolderTreeNode } from "@/functions/http-client/api/folder"
import { installFolderTreeContext } from "./context"
import RowList from "./RowList.vue"

const props = defineProps<{
    /**
     * 所有folder数据。
     */
    folders?: FolderTreeNode[]
    /**
     * 创建占位符。指定此属性时，在指定位置插入创建操作占位符。
     */
    createPosition?: {parentId: number | null, ordinal: number}
    /**
     * 选择器：已选择项。
     */
    selected?: number[]
    /**
     * 选择器：已选择项索引。
     */
    selectedIndex?: (number | undefined)[]
    /**
     * 选择器：最后一个选择项。
     */
    lastSelected?: number | null
    /**
     * 是否允许编辑类操作。这将开启右键菜单的编辑类选项。
     */
    editable?: boolean
    /**
     * 是否允许拖放标签操作。这将允许拖放标签到空隙以重新排序标签。
     */
    droppable?: boolean
    /**
     * 表格的展示模式。
     * std: 标准模式，显示一些额外的行数据。适用于列表页。
     * simple: 简洁模式，只显示标题和项数。适用于编辑器的选择模块。
     */
    mode?: "std" | "simple"
}>()

const emit = defineEmits<{
    (e: "select", selected: number[], lastSelected: number | null): void
    (e: "update:createPosition", position: {parentId: number | null, ordinal: number} | undefined): void
    (e: "update:pinned", folder: FolderTreeNode, pin: boolean): void
    (e: "enter", folder: FolderTreeNode, at: "newTab" | "newWindow" | undefined): void
    (e: "create", v: FolderCreateForm): void
    (e: "move", folder: FolderTreeNode, moveToParentId: number | null | undefined, moveToOrdinal: number): void
    (e: "delete", folder: FolderTreeNode, parentId: number | null, ordinal: number): void
}>()

const { elementRefs } = installFolderTreeContext({
    data: toRef(props, "folders"),
    createPosition: toRef(props, "createPosition"),
    selected: computed(() => props.selected ?? []),
    selectedIndex: computed(() => props.selectedIndex ?? []),
    lastSelected: computed(() => props.lastSelected ?? null),
    editable: toRef(props, "editable"),
    droppable: toRef(props, "droppable"),
    mode: computed(() => props.mode ?? "std"),
    emit: {
        select: (s, l) => emit("select", s, l),
        updateCreatePosition: (position) => emit("update:createPosition", position),
        updatePinned: (folder, pin) => emit("update:pinned", folder, pin),
        enter: (folder, newWindow) => emit("enter", folder, newWindow),
        create: (form) => emit("create", form),
        move: (tag, p, o) => emit("move", tag, p, o),
        delete: (tag, parentId, ordinal) => emit("delete", tag, parentId, ordinal),
    }
})

defineExpose({
    jumpTo: elementRefs.jumpTo
})

</script>

<template>
    <table class="table round hover standard-td w-100">
        <tbody>
            <RowList :data="folders ?? []" :parent-id="null" :indent="0"/>
        </tbody>
    </table>
</template>
