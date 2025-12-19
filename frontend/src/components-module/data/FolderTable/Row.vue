<script setup lang="ts">
import { computed, toRef } from "vue"
import { Icon } from "@/components/universal"
import { platform } from "@/functions/ipc-client"
import { FolderTreeNode } from "@/functions/http-client/api/folder"
import { datetime } from "@/utils/datetime"
import { useFolderDraggable, useFolderDroppable, useFolderTreeContext } from "./context"
import RowList from "./RowList.vue"

const props = defineProps<{
    row: FolderTreeNode
    parentId: number | null
    indent: number
}>()

const { selected, selector, editPosition, expandedState, elementRefs, indexedData, menu, emit, mode } = useFolderTreeContext()

const expanded = computed({
    get: () => expandedState.get(props.row.id),
    set: value => expandedState.set(props.row.id, value)
})

const isJumpTarget = computed(() => elementRefs.jumpTarget.value === props.row.id)
const isSelected = computed(() => editPosition.value === undefined && selected.value.includes(props.row.id))

const { gapState, topDropEvents, bottomDropEvents } = useFolderDroppable(toRef(props, "row"), toRef(props, "indent"), expanded)

const dragEvents = useFolderDraggable(toRef(props, "row"))

const click = (e: MouseEvent) => {
    if(elementRefs.jumpTarget.value === props.row.id) {
        elementRefs.jumpTarget.value = null
    }
    if(e.shiftKey) {
        selector.shiftSelect(props.row.id).finally()
    }else if((e.metaKey && platform === "darwin") || (e.ctrlKey && platform !== "darwin")) {
        selector.appendSelect(props.row.id)
    }else{
        selector.select(props.row.id)
    }
    if(editPosition.value !== undefined) emit.updateEditPosition(undefined)
}

const dblclick = () => {
    const indexed = indexedData.indexedData.value[props.row.id]
    if(indexed) {
        emit.enter(props.row, undefined)
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
    <tr :class="{'selected': isSelected}" @click="click" @dblclick="dblclick" @contextmenu="contextmenu">
        <td class="w-50 pl-1 py-half" :ref="el => elementRefs.setElement(row.id, el)" :draggable="true" v-bind="dragEvents">
            <div :class="$style['top-drop-area']" :style="{'margin-left': `calc(${indent * 1.7}em + 1.5rem)`}" v-bind="topDropEvents"/>
            <div :class="$style['bottom-drop-area']" :style="{'margin-left': `calc(${indent * 1.7}em + 1.5rem)`}" v-bind="bottomDropEvents"/>
            <div v-if="gapState !== null" :class="$style.gap" :style="{'left': `${gapState.indent * 1.7}em`, 'top': gapState.position === 'top' ? '-2px' : undefined, 'bottom': gapState.position === 'bottom' ? '-2px' : undefined}"/>
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
@use "@/styles/base/color"
@use "@/styles/base/size"

.jump-target
    border-radius: size.$radius-size-std
    padding: size.$spacing-half size.$spacing-1
    @media (prefers-color-scheme: light)
        border: solid 2px color.$light-mode-warning
    @media (prefers-color-scheme: dark)
        border: solid 2px color.$dark-mode-warning

.top-drop-area
    position: absolute
    top: 0
    left: 0
    right: 0
    height: 50%

.bottom-drop-area
    position: absolute
    bottom: 0
    left: 0
    right: 0
    height: 50%

.gap
    position: absolute
    z-index: 1
    height: 4px
    right: 0
    background-color: rgba(127, 127, 127, 0.5)
</style>
