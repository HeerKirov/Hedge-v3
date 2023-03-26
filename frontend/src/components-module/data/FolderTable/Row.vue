<script setup lang="ts">
import { computed } from "vue"
import { Icon } from "@/components/universal"
import { FolderTreeNode } from "@/functions/http-client/api/folder"
import { datetime } from "@/utils/datetime"
import { useFolderDroppable, useFolderTreeContext } from "./context"
import RowList from "./RowList.vue"

const props = defineProps<{
    row: FolderTreeNode
    parentId: number | null
    indent: number
}>()

const { selected, createPosition, expandedState, elementRefs, indexedData, menu, emit, mode } = useFolderTreeContext()

const expanded = computed({
    get: () => expandedState.get(props.row.id),
    set: value => expandedState.set(props.row.id, value)
})

const isJumpTarget = computed(() => elementRefs.jumpTarget.value === props.row.id)
const isSelected = computed(() => createPosition.value === undefined && selected.value === props.row.id)

const { dragover: _, ...dropEvents } = useFolderDroppable(computed(() => props.row.id), null)

const click = () => {
    if(elementRefs.jumpTarget.value === props.row.id) {
        elementRefs.jumpTarget.value = null
    }
    emit.updateSelected(props.row.id)
    if(createPosition.value !== undefined) emit.updateCreatePosition(undefined)
}

const dblclick = () => {
    const indexed = indexedData.indexedData.value[props.row.id]
    if(indexed) {
        emit.enter(props.row, indexed.parentId, indexed.ordinal, false)
    }
}

const contextmenu = () => {
    if(elementRefs.jumpTarget.value === props.row.id) {
        elementRefs.jumpTarget.value = null
    }
    menu(props.row)
}

</script>

<template>
    <tr :class="{[$style.tr]: true, [$style.selected]: isSelected}" v-bind="dropEvents" @click="click" @dblclick="dblclick" @contextmenu="contextmenu">
        <td class="w-50 pl-1" :draggable="true" :ref="el => elementRefs.setElement(row.id, el)">
            <span class="pr-1" :style="{'padding-left': `${indent * 1.7}em`}">
                <Icon v-if="row.type === 'FOLDER'" icon="folder"/>
                <Icon v-else-if="expanded" class="is-cursor-pointer" icon="angle-down" @click="expanded = false"/>
                <Icon v-else class="is-cursor-pointer" icon="angle-right" @click="expanded = true"/>
            </span>
            <span :class="{[$style['jump-target']]: isJumpTarget}">{{row.title}}</span>
        </td>
        <td v-if="mode === 'std'" class="px-2">
            <Icon v-if="row.pinned" icon="thumbtack"/>
        </td>
        <td v-if="mode === 'std'" class="w-25">
            <span v-if="row.type === 'FOLDER'">{{row.imageCount}}项</span>
        </td>
        <td v-else class="has-text-right pr-2">
            <span v-if="row.type === 'FOLDER'">{{row.imageCount}}项</span>
        </td>
        <td v-if="mode === 'std'" class="has-text-right pr-2">
            {{datetime.toSimpleFormat(row.updateTime)}}
        </td>
    </tr>
    <RowList v-if="expanded" :data="row.children ?? []" :indent="indent + 1" :parent-id="row.id"/>
</template>

<style module lang="sass">
@import "../../../styles/base/color"
@import "../../../styles/base/size"

//鼠标指上去有变化的颜色。用透明度背景色来实现
.tr:hover
    background-color: rgba(#000000, 0.1)
    @media (prefers-color-scheme: dark)
        background-color: rgba(#FFFFFF, 0.1)
.selected
    background-color: $light-mode-primary
    color: $light-mode-text-inverted-color
    @media (prefers-color-scheme: dark)
        background-color: $dark-mode-primary
        color: $dark-mode-text-inverted-color
    &:hover
        background-color: rgba($light-mode-primary, 0.8)
        @media (prefers-color-scheme: dark)
            background-color: rgba($dark-mode-primary, 0.8)

.jump-target
    border-radius: $radius-size-std
    padding: $spacing-half $spacing-1
    @media (prefers-color-scheme: light)
        border: solid 2px $light-mode-warning
    @media (prefers-color-scheme: dark)
        border: solid 2px $dark-mode-warning
</style>
