<script setup lang="ts">
import { computed } from "vue"
import { platform } from "@/functions/ipc-client"
import { toRef } from "@/utils/reactivity"
import { useDatasetContext, useDragEvents, useDropEvents } from "./context"

const props = defineProps<{
    item: unknown
    index: number
}>()

const { queryInstance, selector, keyOf, dblClick: emitDblClick, rightClick: emitRightClick, drag } = useDatasetContext()

const currentSelected = computed(() => selector.selected.value.find(i => i === keyOf(props.item)) !== undefined)

const dragEvents = useDragEvents({
    queryInstance, keyOf,
    draggable: drag.draggable.value,
    selected: selector.selected,
    byType: drag.byType,
    dataRef: () => toRef(props, "item"),
    dataMap: images => (images as any)
})

const { isLeftDragover, isRightDragover, leftDropEvents, rightDropEvents } = useDropEvents({
    droppable: drag.droppable,
    draggingFromLocal: drag.draggingFromLocal,
    byType: drag.byType,
    indexRef: () => toRef(props, "index"),
    onDrop: drag.dropData
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
    <div :class="$style.item" @click="click" @contextmenu="rightClick" @dblclick="dblClick" v-bind="dragEvents">
        <div :class="$style.content">
            <slot :selected="currentSelected"/>
        </div>
        <div v-if="currentSelected" :class="$style.selected"><div :class="$style['internal-border']"/></div>
        <div v-if="isLeftDragover" :class="$style['left-drop-tooltip']"/>
        <div v-if="isRightDragover" :class="$style['right-drop-tooltip']"/>
        <div :class="$style['left-touch']" v-bind="leftDropEvents"/>
        <div :class="$style['right-touch']" v-bind="rightDropEvents"/>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/color"

.item
    position: relative
    height: 0
    width: calc(100% / var(--var-column-num))
    padding: calc(50% / var(--var-column-num)) 0
    > .content
        position: absolute
        top: 1px
        bottom: 1px
        left: 1px
        right: 1px

    > .selected
        position: absolute
        top: 0
        bottom: 0
        left: 0
        right: 0
        margin: 1px
        border: solid 3px $light-mode-primary
        @media (prefers-color-scheme: dark)
            border-color: $dark-mode-primary
            border-width: 2px

        > .internal-border
            width: 100%
            height: 100%
            box-sizing: border-box
            border: solid 1px $white
            @media (prefers-color-scheme: dark)
                border-color: $black

    //分侧的点击浮层(用于判断拖放位置)
    > .left-touch
        position: absolute
        top: 0
        bottom: 0
        left: 0
        width: 50%
    > .right-touch
        position: absolute
        top: 0
        bottom: 0
        right: 0
        width: 50%

    //两侧的拖放提示条
    > .left-drop-tooltip
        z-index: 1
        position: absolute
        top: 0
        bottom: 0
        left: -2px
        width: 5px
        background-color: rgba(127, 127, 127, 0.6)
    > .right-drop-tooltip
        z-index: 1
        position: absolute
        top: 0
        bottom: 0
        right: -3px
        width: 5px
        background-color: rgba(127, 127, 127, 0.6)
</style>
