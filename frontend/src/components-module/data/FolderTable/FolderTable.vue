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
     * 已选择项的id。
     */
    selected?: number | null | undefined
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
    (e: "update:selected", folderId: number | null): void
    (e: "update:createPosition", position: {parentId: number | null, ordinal: number} | undefined): void
    (e: "update:pinned", folder: FolderTreeNode, pin: boolean): void
    (e: "enter", folder: FolderTreeNode, parentId: number | null, ordinal: number, newWindow: boolean): void
    (e: "create", v: FolderCreateForm): void
    (e: "move", folder: FolderTreeNode, moveToParentId: number | null | undefined, moveToOrdinal: number): void
    (e: "delete", folder: FolderTreeNode, parentId: number | null, ordinal: number): void
}>()

const { elementRefs } = installFolderTreeContext({
    data: toRef(props, "folders"),
    createPosition: toRef(props, "createPosition"),
    selected: computed(() => props.selected ?? null),
    editable: toRef(props, "editable"),
    droppable: toRef(props, "droppable"),
    mode: computed(() => props.mode ?? "std"),
    emit: {
        updateSelected: (folderId) => emit("update:selected", folderId),
        updateCreatePosition: (position) => emit("update:createPosition", position),
        updatePinned: (folder, pin) => emit("update:pinned", folder, pin),
        enter: (folder, parentId, ordinal, newWindow) => emit("enter", folder, parentId, ordinal, newWindow),
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
    <table :class="$style.table">
        <tbody>
            <RowList :data="folders ?? []" :parent-id="null" :indent="0"/>
        </tbody>
    </table>
</template>

<style module lang="sass">
@import "../../../styles/base/color"
@import "../../../styles/base/size"

.table
    border-collapse: collapse
    border-spacing: 0
    white-space: nowrap
    width: 100%

    tr
        line-height: 1.8

    //首行和尾行，在开始和结束位置有圆角
    tr:first-child
        td:first-child
            border-top-left-radius: $radius-size-std
        td:last-child
            border-top-right-radius: $radius-size-std
    tr:last-child
        td:first-child
            border-bottom-left-radius: $radius-size-std
        td:last-child
            border-bottom-right-radius: $radius-size-std

    //非最后一行，有底边的边框
    tr:not(:last-child)
        border: solid $light-mode-border-color
        border-width: 0 0 1px
        @media (prefers-color-scheme: dark)
            border-color: $dark-mode-border-color
</style>
