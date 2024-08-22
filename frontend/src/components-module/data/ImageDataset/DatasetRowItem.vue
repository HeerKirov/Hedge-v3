<script setup lang="ts">
import { computed } from "vue"
import { Icon } from "@/components/universal"
import { platform } from "@/functions/ipc-client"
import { toRef } from "@/utils/reactivity"
import { useCheckBoxEvents, useDatasetContext, useDragEvents, useDropEvents } from "./context"

const props = defineProps<{
    item: unknown
    index: number
}>()

const dataRef = toRef(props, "item")
const indexRef = toRef(props, "index")

const { queryInstance, selector, keyOf, dblClick: emitDblClick, rightClick: emitRightClick, drag } = useDatasetContext()

const currentSelected = computed(() => selector.selected.value.find(i => i === keyOf(props.item)) !== undefined)

const { isMouseOver, checkboxDrop, ...checkboxEvents } = useCheckBoxEvents({selector, keyOf, dataRef, indexRef})

const dragEvents = useDragEvents({
    queryInstance, keyOf,
    draggable: drag.draggable.value,
    selected: selector.selected,
    byType: drag.byType,
    dataRef: () => dataRef,
    dataMap: images => (images as any)
})

const { isLeftDragover, isRightDragover, leftDropEvents, rightDropEvents } = useDropEvents({
    droppable: drag.droppable,
    draggingFromLocal: drag.draggingFromLocal,
    byType: drag.byType,
    indexRef: () => indexRef,
    onDrop: drag.dropData,
    elseProcess: checkboxDrop
})

const click = (e: MouseEvent) => {
    // 追加添加的任意选择项都会排列在选择列表的最后
    // 选择任意项都会使其成为last selected
    if(e.shiftKey) {
        selector.shiftSelect(props.index, keyOf(props.item)).finally()
    }else if((e.metaKey && platform === "darwin") || (e.ctrlKey && platform !== "darwin")) {
        selector.appendSelect(props.index, keyOf(props.item))
    }else{
        selector.select(props.index, keyOf(props.item))
    }
}

const dblClick = (e: MouseEvent) => {
    if(e.ctrlKey || e.shiftKey || e.metaKey) return
    emitDblClick(keyOf(props.item), e.altKey)
}

const rightClick = () => {
    emitRightClick(props.item)
}

</script>

<template>
    <div :class="{[$style.item]: true, [$style.selected]: currentSelected}" @click="click" @contextmenu="rightClick" @dblclick="dblClick" v-bind="dragEvents">
        <slot :selected="currentSelected"/>
        <div v-if="isLeftDragover" :class="$style['left-drop-tooltip']"/>
        <div v-if="isRightDragover" :class="$style['right-drop-tooltip']"/>
        <div :class="$style['right-touch']" v-bind="rightDropEvents"/>
        <div :class="$style['left-touch']" v-bind="leftDropEvents">
            <div :class="{[$style.checkbox]: true, 'opacity': !isMouseOver}" v-bind="checkboxEvents">
                <Icon icon="plus"/>
            </div>
        </div>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/color"
@import "../../../styles/base/size"

.item
    position: relative
    height: var(--var-row-height)
    white-space: nowrap
    overflow: hidden
    text-overflow: ellipsis

    > .content
        position: absolute
        top: 1px
        bottom: 1px
        left: 1px
        right: 1px

    &.selected
        background-color: $light-mode-primary
        color: $light-mode-text-inverted-color
        @media (prefers-color-scheme: dark)
            background-color: $dark-mode-primary
            color: $dark-mode-text-inverted-color

    //分侧的点击浮层(用于判断拖放位置)
    > .left-touch
        position: absolute
        top: 0
        left: 0
        right: 0
        height: 50%
    > .right-touch
        position: absolute
        bottom: 0
        left: 0
        right: 0
        height: 50%

    //两侧的拖放提示条
    > .left-drop-tooltip
        z-index: 1
        position: absolute
        left: 0
        right: 0
        top: -2px
        height: 5px
        background-color: rgba(127, 127, 127, 0.6)
    > .right-drop-tooltip
        z-index: 1
        position: absolute
        left: 0
        right: 0
        bottom: -3px
        height: 5px
        background-color: rgba(127, 127, 127, 0.6)

    //点选器
    .checkbox
        position: absolute
        left: 4px
        top: 1px
        width: 30px
        height: 30px
        padding: 2px
        color: $dark-mode-text-color
        border-radius: $radius-size-std
        border: solid 1px $dark-mode-text-color
        filter: drop-shadow(0 0 1px $dark-mode-background-color)
        > svg
            width: 24px
            height: 24px
</style>
